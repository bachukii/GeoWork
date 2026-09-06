-- ============================================================
-- GeoBid — მიგრაცია v2
-- დაამატებს: რუკის კოორდინატები, გადახდა, ფაილების მიწოდება
--
-- ⚠️ ეს არ ცვლის schema.sql-ს — ეს დამატებაა.
-- გაუშვი Supabase → SQL Editor → New query → Run
-- ============================================================

-- ---------- 1. ORDERS: რუკის მონაცემები ----------
alter table public.orders add column if not exists lat  double precision;
alter table public.orders add column if not exists lng  double precision;
-- პოლიგონი ინახება როგორც [[lat,lng],[lat,lng],...]
alter table public.orders add column if not exists polygon jsonb;

-- ---------- 2. გადახდის სტატუსი ----------
do $$ begin
  create type payment_status as enum ('unpaid','pending','confirmed','refunded');
exception when duplicate_object then null; end $$;

alter table public.orders add column if not exists payment_status payment_status not null default 'unpaid';
alter table public.orders add column if not exists paid_amount numeric default 0;
alter table public.orders add column if not exists payment_ref text;
alter table public.orders add column if not exists paid_at timestamptz;

-- ---------- 3. გადახდების ჟურნალი ----------
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  payer_id   uuid not null references public.profiles(id) on delete cascade,
  amount     numeric not null check (amount > 0),
  reference  text,
  note       text,
  status     payment_status not null default 'pending',
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id)
);

create index if not exists payments_order_idx on public.payments (order_id);

alter table public.payments enable row level security;

create policy payments_read on public.payments
  for select using (payer_id = auth.uid() or public.is_order_party(order_id) or public.is_admin());

create policy payments_insert on public.payments
  for insert with check (payer_id = auth.uid() and public.owns_order(order_id));

create policy payments_admin_update on public.payments
  for update using (public.is_admin());

-- ---------- 4. ფაილების მეტამონაცემები ----------
create table if not exists public.deliverables (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  path        text not null,          -- storage-ის ბილიკი: {order_id}/{uuid}_{name}
  file_name   text not null,
  file_size   bigint,
  mime_type   text,
  version     int not null default 1,
  label       text,                   -- "ნახაზი v1", "შესწორებული" და ა.შ.
  released    boolean not null default false,  -- ამზომველმა გაუშვა კლიენტისთვის
  created_at  timestamptz default now()
);

create index if not exists deliverables_order_idx on public.deliverables (order_id);

alter table public.deliverables enable row level security;

-- helper: არჩეული ამზომველია ამ შეკვეთაზე?
create or replace function public.is_order_surveyor(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    join public.bids b on b.id = o.selected_bid_id
    where o.id = oid and b.surveyor_id = auth.uid()
  );
$$;

-- helper: გადახდა დადასტურებულია?
create or replace function public.order_is_paid(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders where id = oid and payment_status = 'confirmed');
$$;

-- ⚠️ ფაილის ჩანაწერს კლიენტი ხედავს მხოლოდ თუ:
--    ამზომველმა გაუშვა (released) და გადახდა დადასტურებულია
create policy deliverables_read on public.deliverables
  for select using (
    uploader_id = auth.uid()
    or public.is_admin()
    or (public.owns_order(order_id) and released = true and public.order_is_paid(order_id))
  );

create policy deliverables_insert on public.deliverables
  for insert with check (uploader_id = auth.uid() and public.is_order_surveyor(order_id));

create policy deliverables_update_own on public.deliverables
  for update using (uploader_id = auth.uid() or public.is_admin());

create policy deliverables_delete_own on public.deliverables
  for delete using (uploader_id = auth.uid() or public.is_admin());

-- ---------- 5. STORAGE BUCKET ----------
insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- ბილიკის პირველი სეგმენტი = order_id
create or replace function public.storage_order_id(objname text)
returns uuid language sql immutable as $$
  select nullif(split_part(objname, '/', 1), '')::uuid;
$$;

-- ამზომველი ტვირთავს
create policy "deliverables upload by surveyor"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'deliverables'
    and public.is_order_surveyor(public.storage_order_id(name))
  );

-- ⚠️ ჩამოტვირთვა: ამზომველი — ყოველთვის; კლიენტი — მხოლოდ გადახდის შემდეგ
create policy "deliverables read gated"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'deliverables'
    and (
      public.is_admin()
      or public.is_order_surveyor(public.storage_order_id(name))
      or (
        public.owns_order(public.storage_order_id(name))
        and public.order_is_paid(public.storage_order_id(name))
        and exists (
          select 1 from public.deliverables d
          where d.path = storage.objects.name and d.released = true
        )
      )
    )
  );

create policy "deliverables delete by uploader"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'deliverables'
    and public.is_order_surveyor(public.storage_order_id(name))
  );

-- ---------- 6. გადახდის დადასტურება (ადმინი) ----------
create or replace function public.confirm_payment(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_amount numeric; v_ref text;
begin
  if not public.is_admin() then
    raise exception 'მხოლოდ ადმინისტრატორს შეუძლია გადახდის დადასტურება';
  end if;

  select order_id, amount, reference into v_order, v_amount, v_ref
  from public.payments where id = p_payment_id;

  update public.payments
     set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
   where id = p_payment_id;

  update public.orders
     set payment_status = 'confirmed',
         paid_amount = coalesce(paid_amount, 0) + v_amount,
         payment_ref = v_ref,
         paid_at = now()
   where id = v_order;
end; $$;

grant execute on function public.confirm_payment(uuid) to authenticated;
