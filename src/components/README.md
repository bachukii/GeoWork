# GeoBid

ამზომველის გამოძახების პლატფორმა — დამკვეთი აქვეყნებს შეკვეთას, ამზომველები
დამოუკიდებლად აგზავნიან შეთავაზებებს, დამკვეთი ირჩევს.

**მთავარი პრინციპი:** ამზომველები ერთმანეთის ფასებს **ვერ ხედავენ**.
ეს არ არის მხოლოდ UI-ს გადაწყვეტილება — ეს Row Level Security-ითაა დაცული
ბაზის დონეზე (`supabase/schema.sql`, პოლიტიკა `bids_read`), ანუ front-end-ის
გვერდის ავლითაც, პირდაპირ API-ზე მიმართვითაც ვერავინ წაიკითხავს სხვის ფასს.

---

## რა შედის

| როლი | ფუნქციები |
|---|---|
| 👤 დამკვეთი | რეგისტრაცია, შეკვეთის შექმნა (4 ნაბიჯი), საკადასტრო კოდი ან რუკაზე მონიშვნა, ფოტოები, შეთავაზებების შედარება, ამზომველის არჩევა, ჩატი, 5-კრიტერიუმიანი შეფასება, პრობლემის შეტყობინება |
| 📐 ამზომველი | 3-ნაბიჯიანი რეგისტრაცია, რეგიონები/მომსახურებები, შეკვეთების ფიდი (გაფილტრული), შეთავაზების გაგზავნა, სამუშაოს სტატუსების გატარება, ჩატი, პროფილის რედაქტირება |
| 🛡 ადმინი | სტატისტიკა (GMV, საკომისიო), ამზომველების ვერიფიკაცია, შეკვეთების მართვა, საჩივრები, შეფასებების კონტროლი |

---

## 1. Supabase-ის მომზადება

1. გახსენი [supabase.com](https://supabase.com) → **New project**.
2. პროექტში: **SQL Editor** → **New query** → ჩააკოპირე მთლიანი
   `supabase/schema.sql` → **Run**.
3. **Authentication → Providers → Email**: სატესტოდ **გამორთე „Confirm email"**.

   > ეს მნიშვნელოვანია. თუ დადასტურება ჩართულია, რეგისტრაციისას session ჯერ არ
   > იქმნება და პროფილის ჩაწერა RLS-ის გამო ვერ ხერხდება. პროდაქშენში ჯობია
   > ჩართო და პროფილის შექმნა database trigger-ით გააკეთო (იხ. ქვემოთ).

4. **Project Settings → API**-დან აიღე:
   - `Project URL`
   - `anon public` key

---

## 2. ლოკალურად გაშვება

```bash
npm install
cp .env.example .env
# ჩაწერე შენი URL და KEY .env-ში
npm run dev
```

გაიხსნება `http://localhost:5173`

---

## 3. GitHub-ზე ატვირთვა

```bash
git init
git add .
git commit -m "GeoBid MVP"
git branch -M main
git remote add origin https://github.com/<შენი-იუზერი>/geobid.git
git push -u origin main
```

`.env` **არ აიტვირთება** — `.gitignore`-შია. ეს სწორია, გასაღებები
რეპოზიტორიაში არ უნდა მოხვდეს.

---

## 4. ონლაინ გაშვება (Netlify)

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
2. აირჩიე GitHub რეპოზიტორია.
3. Build ავტომატურად წაიკითხება `netlify.toml`-იდან:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site configuration → Environment variables** → დაამატე:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy**.

> ⚠️ Vite-ში env ცვლადები **build-ის დროს** ჩაიკერება. თუ Netlify-ზე ცვლადს
> შემდეგ დაამატებ, საჭიროა **Trigger deploy → Clear cache and deploy site**.

Vercel-ზეც იგივე მუშაობს — framework preset: Vite, იგივე ორი env ცვლადი.

---

## 5. ადმინის დანიშვნა

ადმინის რეგისტრაცია აპიდან შეგნებულად არ არის. დარეგისტრირდი როგორც დამკვეთი,
შემდეგ Supabase → **SQL Editor**:

```sql
-- იპოვე შენი user id
select id, full_name, role from public.profiles;

-- დანიშნე ადმინად
update public.profiles set role = 'admin' where id = '<შენი-uuid>';
```

გამოდი და ხელახლა შედი — ადმინის პანელი გამოჩნდება.

---

## 6. ტესტირების სცენარი

სამი ბრაუზერი (ან ერთი ჩვეულებრივი + ორი incognito):

1. **A** — დამკვეთი: დარეგისტრირდი, გამოაქვეყნე შეკვეთა თბილისში,
   „საკადასტრო აზომვითი ნახაზი". კოდისთვის სცადე `01.72.14.031.045`.
2. **B** — ამზომველი: დარეგისტრირდი, რეგიონებში მონიშნე თბილისი,
   მომსახურებებში „საკადასტრო აზომვითი ნახაზი". შეკვეთა გამოგიჩნდება.
   გააგზავნე 450 ₾ / 2 დღე.
3. **C** — მეორე ამზომველი: იგივე პარამეტრები, გააგზავნე 520 ₾ / 1 დღე.
   **შეამოწმე: C ვერ ხედავს B-ს 450 ₾-ს.**
4. **A** — ნახავს ორივე შეთავაზებას, აირჩევს.
5. არჩეული ამზომველი გაატარებს სტატუსებს დასრულებამდე, A შეაფასებს.

---

## ⚠️ რა არის ჯერ დემო და რა უნდა შეიცვალოს

| ნაწილი | ახლა | რა უნდა გაკეთდეს |
|---|---|---|
| **საკადასტრო კოდი** | `src/lib/cadastral.js` — დეტერმინისტული mock, ფართობს კოდიდან „იგონებს" | NAPR-ის WFS/API. CORS-ის გამო სერვერიდან უნდა გამოიძახო — Netlify Function ან Supabase Edge Function |
| **რუკა** | სქემატური SVG ბადე, პირობითი მასშტაბი (1px ≈ 0.5მ) | Leaflet + OSM/ორთოფოტო, ფართობი გეოგრაფიული კოორდინატებიდან |
| **ფოტოები** | ინახება მხოლოდ ფაილის სახელი | Supabase Storage bucket + signed URLs |
| **SMS ვერიფიკაცია** | არ არის, ავტორიზაცია ელფოსტით | Supabase Phone Auth + Twilio/MessageBird |
| **შეტყობინებები** | არ არის push | Web Push ან Supabase Realtime + service worker |
| **გადახდა/ესქრო** | არ არის | ცალკე იურიდიული და საბანკო საკითხია — ჯერ ვალიდაცია, მერე ეს |

---

## პროდაქშენისთვის: პროფილის შექმნა trigger-ით

როცა „Confirm email"-ს ჩართავ, პროფილი უნდა შეიქმნას სერვერზე. დაამატე:

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone, user_type)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', 'უსახელო'),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'user_type')::user_type, 'individual')
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

შემდეგ `AuthContext.jsx`-ში `signUp`-ს გადააწოდე `options.data` მეტამონაცემებით
და მოაშორე პირდაპირი `profiles.insert`.

---

## სტრუქტურა

```
src/
  lib/          supabase კლიენტი, კონსტანტები, საკადასტრო lookup
  context/      AuthContext — session + profile + როლი
  components/   UI, NewOrder, Chat, RateForm, AreaDraw, SurveyorProfile
  views/        AuthScreen, ClientView, SurveyorView, AdminView
supabase/
  schema.sql    ცხრილები + RLS პოლიტიკები
```
