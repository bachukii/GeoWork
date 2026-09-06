-- ============================================================
-- GeoBid — Supabase schema
-- გაუშვი Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- ENUMS ----------
create type user_role   as enum ('client','surveyor','admin');
create type user_type   as enum ('individual','company');
create type order_status as enum ('open','selected','scheduled','inprogress','processing','done','rated','cancel');
create type complaint_status as enum ('open','resolved');

-- ---------- PROFILES ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null,
  full_name    text not null,
  phone        text,
  user_type    user_type not null default 'individual',
  company_name text,
  company_id   text,
  website      text,
  experience   int default 0,
  bio          text,
  regions      text[] default '{}',
  services     text[] default '{}',
  verified     boolean default false,
  created_at   timestamptz default now()
);

-- ---------- ORDERS ----------
create sequence public.order_num_seq start 1001;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  num             int not null default nextval('public.order_num_seq'),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  category        text not null,
  service         text not null,
  region          text not null,
  place           text,
  cadastral_code  text,
  area            numeric,
  area_source     text check (area_source in ('cadastral','manual')),
  photos          text[] default '{}',
  description     text,
  deadline        text,
  status          order_status not null default 'open',
  selected_bid_id uuid,
  created_at      timestamptz default now()
);

-- ---------- BIDS ----------
create table public.bids (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  surveyor_id uuid not null references public.profiles(id) on delete cascade,
  price       numeric not null check (price > 0),
  days        int not null check (days > 0),
  comment     text,
  created_at  timestamptz default now(),
  unique (order_id, surveyor_id)
);

alter table public.orders
  add constraint orders_selected_bid_fk
  foreign key (selected_bid_id) references public.bids(id) on delete set null;

-- ---------- MESSAGES ----------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

-- ---------- RATINGS ----------
create table public.ratings (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  from_id       uuid not null references public.profiles(id) on delete cascade,
  to_id         uuid not null references public.profiles(id) on delete cascade,
  overall       int not null check (overall between 1 and 5),
  communication int check (communication between 1 and 5),
  price         int check (price between 1 and 5),
  timeliness    int check (timeliness between 1 and 5),
  quality       int check (quality between 1 and 5),
  comment       text,
  created_at    timestamptz default now(),
  unique (order_id, from_id)
);

-- ---------- COMPLAINTS ----------
create table public.complaints (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  by_id      uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  note       text,
  status     complaint_status not null default 'open',
  created_at timestamptz default now()
);

-- ---------- INDEXES ----------
create index on public.orders (status);
create index on public.orders (client_id);
create index on public.orders (region);
create index on public.bids (order_id);
create index on public.bids (surveyor_id);
create index on public.messages (order_id);
create index on public.ratings (to_id);

-- ============================================================
-- HELPER FUNCTIONS (security definer — თავიდან ვიცილებთ RLS რეკურსიას)
-- ============================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.owns_order(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders where id = oid and client_id = auth.uid());
$$;

-- მომხმარებელი ჩართულია შეკვეთაში: ან დამკვეთია, ან არჩეული ამზომველი
create or replace function public.is_order_party(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    left join public.bids b on b.id = o.selected_bid_id
    where o.id = oid and (o.client_id = auth.uid() or b.surveyor_id = auth.uid())
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles   enable row level security;
alter table public.orders     enable row level security;
alter table public.bids       enable row level security;
alter table public.messages   enable row level security;
alter table public.ratings    enable row level security;
alter table public.complaints enable row level security;

-- ---------- PROFILES ----------
-- პროფილები საჯაროდ იკითხება (ამზომველის პროფილი, რეიტინგი)
create policy profiles_read on public.profiles
  for select using (true);

create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- ORDERS ----------
-- დამკვეთი ხედავს თავისას; ამზომველი ხედავს ღია შეკვეთებს + სადაც არჩეულია
create policy orders_read on public.orders
  for select using (
    client_id = auth.uid()
    or public.is_admin()
    or (public.my_role() = 'surveyor' and (
          status = 'open'
          or exists (select 1 from public.bids b where b.id = orders.selected_bid_id and b.surveyor_id = auth.uid())
       ))
  );

create policy orders_insert_client on public.orders
  for insert with check (client_id = auth.uid() and public.my_role() = 'client');

-- დამკვეთი ცვლის (ამზომველის არჩევა), არჩეული ამზომველი ცვლის სტატუსს
create policy orders_update_party on public.orders
  for update using (
    client_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.bids b where b.id = orders.selected_bid_id and b.surveyor_id = auth.uid())
  );

create policy orders_delete_owner on public.orders
  for delete using (client_id = auth.uid() or public.is_admin());

-- ---------- BIDS ⚠️ დახურული შეთავაზებების გული ----------
-- ამზომველი ხედავს მხოლოდ თავის შეთავაზებას.
-- დამკვეთი ხედავს ყველა შეთავაზებას თავის შეკვეთაზე.
-- ეს არის სერვერის მხარეს, ანუ front-end-ის გვერდის ავლით ვერავინ ნახავს სხვის ფასს.
create policy bids_read on public.bids
  for select using (
    surveyor_id = auth.uid()
    or public.owns_order(order_id)
    or public.is_admin()
  );

create policy bids_insert_surveyor on public.bids
  for insert with check (
    surveyor_id = auth.uid()
    and public.my_role() = 'surveyor'
    and exists (select 1 from public.orders o where o.id = order_id and o.status = 'open')
  );

create policy bids_update_own on public.bids
  for update using (surveyor_id = auth.uid())
  with check (surveyor_id = auth.uid());

create policy bids_delete_own on public.bids
  for delete using (surveyor_id = auth.uid() or public.is_admin());

-- ---------- MESSAGES ----------
create policy messages_read on public.messages
  for select using (public.is_order_party(order_id) or public.is_admin());

create policy messages_insert on public.messages
  for insert with check (sender_id = auth.uid() and public.is_order_party(order_id));

-- ---------- RATINGS ----------
create policy ratings_read on public.ratings
  for select using (true);

create policy ratings_insert on public.ratings
  for insert with check (from_id = auth.uid() and public.is_order_party(order_id));

create policy ratings_admin_delete on public.ratings
  for delete using (public.is_admin());

-- ---------- COMPLAINTS ----------
create policy complaints_read on public.complaints
  for select using (by_id = auth.uid() or public.is_admin());

create policy complaints_insert on public.complaints
  for insert with check (by_id = auth.uid() and public.is_order_party(order_id));

create policy complaints_admin_update on public.complaints
  for update using (public.is_admin());

-- ============================================================
-- AGGREGATED RATING VIEW (საჯარო — არ შეიცავს ფასებს)
-- ============================================================
create or replace view public.surveyor_stats as
select
  p.id,
  p.full_name,
  coalesce(avg(r.overall), 0)::numeric(3,2) as avg_rating,
  count(r.id)                               as review_count,
  (select count(*) from public.orders o
     join public.bids b on b.id = o.selected_bid_id
    where b.surveyor_id = p.id and o.status in ('done','rated')) as completed_jobs
from public.profiles p
left join public.ratings r on r.to_id = p.id
where p.role = 'surveyor'
group by p.id, p.full_name;

grant select on public.surveyor_stats to anon, authenticated;

-- ============================================================
-- ADMIN-ის დანიშვნა: შექმენი მომხმარებელი აპში, მერე გაუშვი:
--   update public.profiles set role = 'admin' where id = '<user-uuid>';
-- ============================================================
