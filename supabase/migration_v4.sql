-- ============================================================
-- GeoBid — მიგრაცია v4: დამკვეთის ფოტოების რეალური ატვირთვა
-- გაუშვი Supabase → SQL Editor → Run. შეიძლება რამდენჯერმე გაეშვას.
-- ============================================================

-- ფოტოების bucket. private — წვდომა მხოლოდ ხელმოწერილი ბმულით.
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', false)
on conflict (id) do nothing;

-- ბილიკის სტრუქტურა: {user_id}/{order_uuid}/{file}
-- პირველი სეგმენტი ატვირთვისას გვჭირდება, რადგან შეკვეთა ჯერ არ არსებობს.
create or replace function public.storage_owner_id(objname text)
returns uuid language sql immutable as $$
  select nullif(split_part(objname, '/', 1), '')::uuid;
$$;

drop policy if exists "order photos upload own"  on storage.objects;
drop policy if exists "order photos read"        on storage.objects;
drop policy if exists "order photos delete own"  on storage.objects;

-- ატვირთვა: მხოლოდ საკუთარ საქაღალდეში
create policy "order photos upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'order-photos'
    and public.storage_owner_id(name) = auth.uid()
  );

-- ⚠️ კითხვა: მფლობელი, ნებისმიერი ამზომველი (რომ ფასი განსაზღვროს), ადმინი.
-- ამზომველს ფოტოები შეკვეთამდე სჭირდება, ამიტომ როლზეა და არა კონკრეტულ შეკვეთაზე.
create policy "order photos read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'order-photos'
    and (
      public.storage_owner_id(name) = auth.uid()
      or public.my_role() = 'surveyor'
      or public.is_admin()
    )
  );

create policy "order photos delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'order-photos'
    and (public.storage_owner_id(name) = auth.uid() or public.is_admin())
  );
