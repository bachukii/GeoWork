-- ============================================================
-- GeoBid — მიგრაცია v6: გადახდას ამზომველი ადასტურებს
-- გაუშვი Supabase → SQL Editor → Run. შეიძლება რამდენჯერმე გაეშვას.
--
-- 1) surveyor_confirm_payment(order) — არჩეული ამზომველი (ან ადმინი)
--    ადასტურებს, რომ თანხა ჩაერიცხა. ამის შემდეგ დამკვეთი ხედავს
--    გაგზავნილ ნახაზს (deliverables_read / storage პოლიტიკები უცვლელია).
-- 2) დაცვა: ადრე orders_update_party დამკვეთს აძლევდა საშუალებას,
--    პირდაპირ დაეყენებინა payment_status = 'confirmed' და ნახაზი
--    გადაუხდელად ჩამოეტვირთა. ახლა გადახდის ველებს მხოლოდ
--    დადასტურების ფუნქციები ან ადმინი ცვლის.
-- ============================================================

-- ---------- 1. ამზომველის დადასტურება ----------
create or replace function public.surveyor_confirm_payment(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_price  numeric;
  v_ref    text;
begin
  if not (public.is_order_surveyor(p_order) or public.is_admin()) then
    raise exception 'გადახდას მხოლოდ ამ შეკვეთის ამზომველი ადასტურებს';
  end if;

  select o.client_id, b.price into v_client, v_price
  from public.orders o
  join public.bids b on b.id = o.selected_bid_id
  where o.id = p_order;

  if v_client is null then
    raise exception 'შეკვეთაზე ამზომველი არჩეული არ არის';
  end if;

  -- დამკვეთის გამოცხადებული გადახდა(ებ)ი → დადასტურებული
  update public.payments
     set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
   where order_id = p_order and status = 'pending';

  -- დამკვეთს თუ არ გამოუცხადებია — ჩანაწერს თავად ვქმნით
  if not exists (select 1 from public.payments where order_id = p_order and status = 'confirmed') then
    insert into public.payments (order_id, payer_id, amount, status, confirmed_at, confirmed_by, note)
    values (p_order, v_client, v_price, 'confirmed', now(), auth.uid(), 'დაადასტურა ამზომველმა');
  end if;

  select reference into v_ref from public.payments
   where order_id = p_order and status = 'confirmed' and reference is not null
   order by confirmed_at desc limit 1;

  perform set_config('geobid.payment_ok', 'on', true);
  update public.orders
     set payment_status = 'confirmed',
         paid_amount    = v_price,
         payment_ref    = coalesce(v_ref, payment_ref),
         paid_at        = now()
   where id = p_order;
  perform set_config('geobid.payment_ok', 'off', true);
end;
$$;

grant execute on function public.surveyor_confirm_payment(uuid) to authenticated;

-- ადმინის ძველი ფუნქციაც დაცვას უნდა გაუძლოს
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

  perform set_config('geobid.payment_ok', 'on', true);
  update public.orders
     set payment_status = 'confirmed',
         paid_amount = coalesce(paid_amount, 0) + v_amount,
         payment_ref = v_ref,
         paid_at = now()
   where id = v_order;
  perform set_config('geobid.payment_ok', 'off', true);
end; $$;

-- ---------- 2. გადახდის ველების დაცვა ----------
-- დამკვეთს შეუძლია მხოლოდ unpaid → pending („გადავიხადე").
-- დანარჩენი მხოლოდ ზემოთა ფუნქციებით ან ადმინით.
create or replace function public.guard_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or public.is_admin()
     or coalesce(current_setting('geobid.payment_ok', true), 'off') = 'on' then
    return new;
  end if;

  if new.paid_amount is distinct from old.paid_amount
     or new.payment_ref is distinct from old.payment_ref
     or new.paid_at is distinct from old.paid_at then
    raise exception 'გადახდის მონაცემებს პირდაპირ ვერ შეცვლი';
  end if;

  if new.payment_status is distinct from old.payment_status then
    if not (new.payment_status = 'pending'
            and old.payment_status in ('unpaid', 'pending')
            and old.client_id = auth.uid()) then
      raise exception 'გადახდის სტატუსს ადასტურებს ამზომველი';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_guard_payment on public.orders;
create trigger orders_guard_payment
  before update on public.orders
  for each row execute function public.guard_order_payment();

-- დამკვეთი გადახდას მხოლოდ „მოლოდინში" სტატუსით აცხადებს
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
  for insert with check (
    payer_id = auth.uid() and public.owns_order(order_id) and status = 'pending'
  );
