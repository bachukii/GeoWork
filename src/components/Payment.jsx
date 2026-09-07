import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { money, dateOf } from "../lib/constants";
import { Row, Spinner } from "./UI";

const PAY_STATUS = {
  unpaid:    { label: "გადაუხდელი",   cls: "s-cancel",  icon: "○" },
  pending:   { label: "დადასტურების მოლოდინში", cls: "s-open", icon: "◐" },
  confirmed: { label: "გადახდილი",     cls: "s-done",    icon: "✓" },
  refunded:  { label: "დაბრუნებული",   cls: "s-cancel",  icon: "↩" },
};

export const PayPill = ({ s }) => {
  const m = PAY_STATUS[s] || PAY_STATUS.unpaid;
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
};

// ============ დამკვეთი: გადახდის გამოცხადება ============
export default function Payment({ order, amount, meId, toast, onChanged }) {
  const [payments, setPayments] = useState(null);
  const [form, setForm] = useState(false);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("payments").select("*")
      .eq("order_id", order.id).order("created_at", { ascending: false });
    setPayments(data || []);
  }, [order.id]);

  useEffect(() => { load(); }, [load]);

  const declare = async () => {
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      order_id: order.id, payer_id: meId, amount,
      reference: reference.trim() || null, note: note.trim() || null, status: "pending",
    });
    if (!error) {
      await supabase.from("orders").update({ payment_status: "pending" }).eq("id", order.id);
    }
    setBusy(false);
    if (error) { toast("ვერ გაიგზავნა"); return; }
    setForm(false); setReference(""); setNote("");
    toast("გადახდა დასადასტურებლად გაიგზავნა");
    load(); onChanged?.();
  };

  const st = order.payment_status || "unpaid";

  return (
    <div>
      <div className="card tick" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="lbl">გადახდა</span>
          <PayPill s={st} />
        </div>
        <Row l="შეთანხმებული თანხა" v={money(amount)} mono />
        {order.paid_amount > 0 && <Row l="გადახდილი" v={money(order.paid_amount)} mono />}
        {order.payment_ref && <Row l="ტრანზაქციის №" v={order.payment_ref} mono />}
        {order.paid_at && <Row l="თარიღი" v={dateOf(order.paid_at)} />}
      </div>

      {st === "unpaid" && (
        form ? (
          <div className="card">
            <div className="lbl">ტრანზაქციის ნომერი / ამონაწერი</div>
            <input className="inp mono" value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="მაგ: TBC 2409881234" />
            <div className="lbl" style={{ marginTop: 8 }}>კომენტარი</div>
            <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} />
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button className="btn2" onClick={() => setForm(false)}>გაუქმება</button>
              <button className="btn" disabled={busy} onClick={declare}>
                {busy ? "იგზავნება…" : "გადახდის გამოცხადება"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="btn" onClick={() => setForm(true)}>გადავიხადე — დადასტურება</button>
            <div className="warn" style={{ marginTop: 8 }}>
              ონლაინ გადახდა (ბარათით) ჯერ არ არის ჩართული. ამჟამად თანხას გადარიცხავ
              პირდაპირ, აქ კი აფიქსირებ ტრანზაქციის ნომერს — ადმინისტრატორი დაადასტურებს
              და ფაილები განიბლოკება.
            </div>
          </>
        )
      )}

      {st === "pending" && (
        <div className="card" style={{ fontSize: 13 }}>
          გადახდა გაგზავნილია დასადასტურებლად. ადმინისტრატორის დადასტურების შემდეგ
          ნახაზები ავტომატურად გამოჩნდება.
        </div>
      )}

      {st === "confirmed" && (
        <div className="card" style={{ fontSize: 13, color: "var(--field)" }}>
          გადახდა დადასტურებულია — ფაილები ხელმისაწვდომია.
        </div>
      )}

      {payments === null ? null : payments.length > 0 && (
        <>
          <div className="lbl" style={{ margin: "12px 0 4px" }}>ისტორია</div>
          {payments.map((p) => (
            <div key={p.id} className="card row" style={{ marginBottom: 4, fontSize: 12.5, alignItems: "center" }}>
              <span className="mono">{money(p.amount)}</span>
              <span className="muted">{dateOf(p.created_at)}</span>
              <PayPill s={p.status} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ============ ადმინი: გადახდების დადასტურება ============
export function PaymentsAdmin({ toast }) {
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    const { data: pays } = await supabase.from("payments").select("*")
      .order("created_at", { ascending: false });
    if (!pays?.length) { setRows([]); return; }

    const orderIds = [...new Set(pays.map((p) => p.order_id))];
    const payerIds = [...new Set(pays.map((p) => p.payer_id))];
    const [{ data: orders }, { data: profs }] = await Promise.all([
      supabase.from("orders").select("id,num,service").in("id", orderIds),
      supabase.from("profiles").select("id,full_name").in("id", payerIds),
    ]);
    const oMap = Object.fromEntries((orders || []).map((o) => [o.id, o]));
    const pMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    setRows(pays.map((p) => ({ ...p, order: oMap[p.order_id], payer: pMap[p.payer_id] })));
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async (p) => {
    const { error } = await supabase.rpc("confirm_payment", { p_payment_id: p.id });
    if (error) { toast("დადასტურება ვერ მოხერხდა"); return; }
    toast("გადახდა დადასტურდა — ფაილები განიბლოკა");
    load();
  };

  if (rows === null) return <Spinner />;
  if (rows.length === 0) {
    return <div className="center" style={{ fontSize: 14 }}>გადახდა არ არის</div>;
  }

  return (
    <div className="col">
      {rows.map((p) => (
        <div key={p.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }} className="mono">{money(p.amount)}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                #{p.order?.num} · {p.payer?.full_name} · {dateOf(p.created_at)}
              </div>
              {p.reference && <div className="mono" style={{ fontSize: 11.5 }}>№ {p.reference}</div>}
            </div>
            <PayPill s={p.status} />
          </div>
          {p.status === "pending" && (
            <button className="btn btn-sm" style={{ marginTop: 8, width: "100%" }}
              onClick={() => confirm(p)}>დადასტურება</button>
          )}
        </div>
      ))}
    </div>
  );
}
