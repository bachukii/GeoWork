-- ============================================================
-- GeoBid — მიგრაცია v3: ვადის ათვლა
-- გაუშვი Supabase → SQL Editor → Run
-- შეიძლება რამდენჯერმე გაეშვას.
-- ============================================================

-- როდის უნდა დასრულდეს სამუშაო.
-- ივსება მაშინ, როცა დამკვეთი ირჩევს ამზომველს: now() + შეთავაზებული დღეები
alter table public.orders add column if not exists due_at timestamptz;

-- როდის აირჩიეს ამზომველი (ათვლის საწყისი წერტილი)
alter table public.orders add column if not exists started_at timestamptz;

create index if not exists orders_due_idx on public.orders (due_at);
