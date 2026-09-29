-- ============================================================
-- GeoBid — მიგრაცია v5: პროფილი trigger-ით + როლის დაცვა
-- გაუშვი Supabase → SQL Editor → Run. შეიძლება რამდენჯერმე გაეშვას.
--
-- 1) პროფილი იქმნება ბაზაში, auth.users-ში ჩანაწერის გაჩენისთანავე.
--    ამიტომ „Confirm email" შეიძლება ჩართული იყოს — session აღარ გვჭირდება.
-- 2) მომხმარებელი ვეღარ შეიცვლის საკუთარ role-ს / verified-ს.
--    (ადრე profiles_update_self ამის საშუალებას იძლეოდა — ნებისმიერი
--    მომხმარებელი ბრაუზერის კონსოლიდან ადმინი ხდებოდა.)
-- ============================================================

-- ---------- 1. პროფილის შექმნა რეგისტრაციისას ----------
-- ველები მოდის supabase.auth.signUp({ options: { data: {...} } })-იდან.
-- role მხოლოდ client/surveyor შეიძლება იყოს — admin აქედან ვერ მოხვდება.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r     public.user_role;
  utype public.user_type;
begin
  r := case when m->>'role' = 'surveyor' then 'surveyor' else 'client' end;
  utype := case when m->>'user_type' = 'company' then 'company' else 'individual' end;

  insert into public.profiles (
    id, role, full_name, phone, user_type, company_name, company_id,
    website, experience, bio, regions, services, verified
  ) values (
    new.id,
    r,
    coalesce(nullif(trim(m->>'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(m->>'phone', ''),
    utype,
    nullif(m->>'company_name', ''),
    nullif(m->>'company_id', ''),
    nullif(m->>'website', ''),
    case when r = 'surveyor' and m->>'experience' ~ '^\d{1,3}$' then (m->>'experience')::int else 0 end,
    nullif(m->>'bio', ''),
    case when r = 'surveyor' and jsonb_typeof(m->'regions') = 'array'
         then array(select jsonb_array_elements_text(m->'regions')) else '{}' end,
    case when r = 'surveyor' and jsonb_typeof(m->'services') = 'array'
         then array(select jsonb_array_elements_text(m->'services')) else '{}' end,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. role / verified მხოლოდ ადმინს ----------
-- auth.uid() null-ია SQL Editor-იდან და service_role-ით — იქიდან ცვლილება
-- დაშვებულია (მაგ. პირველი ადმინის დანიშვნა).
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.role = 'admin' or new.verified then
        raise exception 'role/verified can only be set by an admin';
      end if;
    elsif new.role is distinct from old.role
       or new.verified is distinct from old.verified then
      raise exception 'role/verified can only be changed by an admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------- 3. ძველი, „გაჭედილი" მომხმარებლები ----------
-- ვინც ამ მიგრაციამდე დარეგისტრირდა ჩართული „Confirm email"-ით, პროფილი არ აქვს
-- და მისი როლიც (დამკვეთი/ამზომველი) არსად წერია. ასეთები წაშალე
-- (Authentication → Users) და თავიდან დარეგისტრირდნენ:
--
--   select au.id, au.email from auth.users au
--   left join public.profiles p on p.id = au.id where p.id is null;
