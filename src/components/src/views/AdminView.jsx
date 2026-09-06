import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Pill, Row, Empty, Stars, Spinner } from "../components/UI";
import { money, dateOf } from "../lib/constants";
import { PaymentsAdmin } from "../components/Payment";

export default function AdminView({ toast }) {
  const { signOut } = useAuth();
  const [tab, setTab] = useState("stats");
  const [d, setD] = useState(null);

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: orders }, { data: bids }, { data: complaints }, { data: ratings }, { data: stats }] =
      await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("bids").select("*"),
        supabase.from("complaints").select("*").order("created_at", { ascending: false }),
        supabase.from("ratings").select("*").order("created_at", { ascending: false }),
        supabase.from("surveyor_stats").select("*"),
      ]);
    setD({
      profiles: profiles || [], orders: orders || [], bids: bids || [],
      complaints: complaints || [], ratings: ratings || [],
      stats: Object.fromEntries((stats || []).map((s) => [s.id, s])),
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!d) return <Spinner />;

  const nameOf = (id) => d.profiles.find((p) => p.id === id)?.full_name || "—";
  const surveyors = d.profiles.filter((p) => p.role === "surveyor");
  const clients = d.profiles.filter((p) => p.role === "client");
  const gmv = d.orders.reduce((a, o) => {
    const b = d.bids.find((x) => x.id === o.selected_bid_id);
    return a + Number(b?.price || 0);
  }, 0);

  const toggleVerify = async (p) => {
    const { error } = await supabase.from("profiles").update({ verified: !p.verified }).eq("id", p.id);
    toast(error ? "ვერ შეიცვალა" : (p.verified ? "ვერიფიკაცია მოხსნილია" : "ვერიფიცირებულია ✓"));
    load();
  };
  const cancelOrder = async (o) => {
    const { error } = await supabase.from("orders").update({ status: "cancel" }).eq("id", o.id);
    toast(error ? "ვერ გაუქმდა" : "შეკვეთა გაუქმდა"); load();
  };
  const resolve = async (c) => {
    await supabase.from("complaints").update({ status: "resolved" }).eq("id", c.id);
    load();
  };
  const delRating = async (r) => {
    await supabase.from("ratings").delete().eq("id", r.id);
    load();
  };

  return (
    <>
      {tab === "stats" && (
        <div style={{ padding: 16 }}>
          <div className="card tick" style={{ marginBottom: 12 }}>
            <div className="grid3">
              <div className="stat"><div className="n mono">{clients.length}</div><div className="t">დამკვეთი</div></div>
              <div className="stat"><div className="n mono">{surveyors.length}</div><div className="t">ამზომველი</div></div>
              <div className="stat"><div className="n mono">{d.orders.length}</div><div className="t">შეკვეთა</div></div>
            </div>
            <div className="hl" />
            <div className="grid3">
              <div className="stat"><div className="n mono">{d.bids.length}</div><div className="t">შეთავაზება</div></div>
              <div className="stat"><div className="n mono">{d.orders.filter((o) => o.status === "open").length}</div><div className="t">ღია</div></div>
              <div className="stat"><div className="n mono" style={{ color: "var(--survey)" }}>
                {d.complaints.filter((c) => c.status === "open").length}</div><div className="t">საჩივარი</div></div>
            </div>
            <div className="hl" />
            <Row l="შეთანხმებული ბრუნვა (GMV)" v={money(gmv)} mono />
            <Row l="საკომისიო 5%" v={money(gmv * 0.05)} mono />
            <Row l="ვერიფიცირებული" v={`${surveyors.filter((s) => s.verified).length} / ${surveyors.length}`} mono />
          </div>
          <button className="btn2 btn-danger" onClick={signOut}>გასვლა</button>
        </div>
      )}

      {tab === "users" && (
        <div style={{ padding: 16 }}>
          <div className="lbl" style={{ marginBottom: 6 }}>ამზომველები — ვერიფიკაცია</div>
          {surveyors.length === 0 ? <Empty t="ამზომველი არ არის" /> : surveyors.map((p) => {
            const st = d.stats[p.id];
            return (
              <div key={p.id} className="card" style={{ marginBottom: 6, display: "flex",
                justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.full_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    <Stars v={st?.avg_rating} /> · {(p.regions || []).length} რეგ. · {(p.services || []).length} მომს.
                  </div>
                </div>
                <button className="btn btn-sm"
                  style={{ background: p.verified ? "var(--field)" : "var(--safety)", whiteSpace: "nowrap" }}
                  onClick={() => toggleVerify(p)}>{p.verified ? "✓ Verified" : "ვერიფიკაცია"}</button>
              </div>
            );
          })}

          <div className="lbl" style={{ margin: "16px 0 6px" }}>დამკვეთები</div>
          {clients.map((p) => (
            <div key={p.id} className="card" style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700 }}>{p.full_name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {p.phone} · {d.orders.filter((o) => o.client_id === p.id).length} შეკვეთა
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div style={{ padding: 16 }}>
          {d.orders.length === 0 ? <Empty t="შეკვეთა არ არის" /> : d.orders.map((o) => (
            <div key={o.id} className="card" style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span className="mono muted" style={{ fontSize: 11 }}>#{o.num}</span>
                <Pill s={o.status} />
              </div>
              <div style={{ fontWeight: 700 }}>{o.service}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {nameOf(o.client_id)} · {o.place} · {d.bids.filter((b) => b.order_id === o.id).length} შეთავაზება
              </div>
              {!["done", "rated", "cancel"].includes(o.status) && (
                <button className="btn2 btn-sm btn-danger" style={{ marginTop: 6 }}
                  onClick={() => cancelOrder(o)}>გაუქმება</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "payments" && (
        <div style={{ padding: 16 }}>
          <div className="lbl" style={{ marginBottom: 6 }}>გადახდების დადასტურება</div>
          <PaymentsAdmin toast={toast} />
        </div>
      )}

      {tab === "complaints" && (
        <div style={{ padding: 16 }}>
          <div className="lbl" style={{ marginBottom: 6 }}>საჩივრები</div>
          {d.complaints.length === 0 ? <Empty t="საჩივარი არ არის" /> : d.complaints.map((c) => {
            const o = d.orders.find((x) => x.id === c.order_id);
            return (
              <div key={c.id} className="card" style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>{c.kind}</span>
                  <span className={`pill ${c.status === "open" ? "s-cancel" : "s-done"}`}>
                    {c.status === "open" ? "ღია" : "მოგვარებული"}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  #{o?.num} · {nameOf(c.by_id)} · {dateOf(c.created_at)}
                </div>
                {c.status === "open" && (
                  <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => resolve(c)}>
                    მოგვარებულად მონიშვნა
                  </button>
                )}
              </div>
            );
          })}

          <div className="lbl" style={{ margin: "16px 0 6px" }}>შეფასებების კონტროლი</div>
          {d.ratings.length === 0 ? <Empty t="შეფასება არ არის" /> : d.ratings.map((r) => (
            <div key={r.id} className="card row" style={{ marginBottom: 6, fontSize: 13, alignItems: "center" }}>
              <span><Stars v={r.overall} /> → {nameOf(r.to_id)}</span>
              <button style={{ background: "none", border: "none", color: "var(--survey)", cursor: "pointer" }}
                onClick={() => delRating(r)}>წაშლა</button>
            </div>
          ))}
        </div>
      )}

      <div className="nav">
        <button className={`navbtn ${tab === "stats" ? "on" : ""}`} onClick={() => setTab("stats")}><span className="ic">📊</span>სტატისტიკა</button>
        <button className={`navbtn ${tab === "users" ? "on" : ""}`} onClick={() => setTab("users")}><span className="ic">👥</span>მომხმარებლები</button>
        <button className={`navbtn ${tab === "orders" ? "on" : ""}`} onClick={() => setTab("orders")}><span className="ic">📋</span>შეკვეთები</button>
        <button className={`navbtn ${tab === "payments" ? "on" : ""}`} onClick={() => setTab("payments")}><span className="ic">💳</span>გადახდები</button>
        <button className={`navbtn ${tab === "complaints" ? "on" : ""}`} onClick={() => setTab("complaints")}><span className="ic">🚨</span>საჩივრები</button>
      </div>
    </>
  );
}
