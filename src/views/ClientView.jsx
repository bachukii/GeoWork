import React, { useState, useEffect, useCallback } from "react";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Pill, Row, Empty, Stars, Sheet, Spinner } from "../components/UI";
import NewOrder from "../components/NewOrder";
import Chat from "../components/Chat";
import RateForm from "../components/RateForm";
import SurveyorProfile from "../components/SurveyorProfile";
import MapView from "../components/MapView";
import Payment, { PayPill } from "../components/Payment";
import { DeliverablesDownload } from "../components/Deliverables";
import { money, m2, FLOW, STATUS, COMPLAINT_KINDS } from "../lib/constants";

export default function ClientView({ toast }) {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("orders").select("*")
      .eq("client_id", profile.id).order("created_at", { ascending: false });
    if (error) { toast("შეკვეთები ვერ ჩაიტვირთა"); return; }
    setOrders(data || []);
  }, [profile.id, toast]);

  useEffect(() => { load(); }, [load]);

  const publish = async (payload) => {
    setBusy(true);
    const { error } = await supabase.from("orders").insert({ ...payload, client_id: profile.id });
    setBusy(false);
    if (error) { toast("გამოქვეყნება ვერ მოხერხდა"); return; }
    setShowNew(false); toast("შეკვეთა გამოქვეყნდა"); load();
  };

  const active = (orders || []).filter((o) => !["done", "rated", "cancel"].includes(o.status));
  const done = (orders || []).filter((o) => ["done", "rated"].includes(o.status));

  return (
    <>
      <div className="shell-body">
      {tab === "orders" && (
        <div style={{ padding: 16 }}>
          <button className="btn btn-go" style={{ marginBottom: 14 }} onClick={() => setShowNew(true)}>
            ახალი შეკვეთა
          </button>

          <div className="card tick" style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div className="stat"><div className="n mono">{active.length}</div><div className="t">აქტიური</div></div>
            <div className="stat"><div className="n mono">{done.length}</div><div className="t">დასრულებული</div></div>
          </div>

          {orders === null ? <Spinner /> :
            orders.length === 0 ? <Empty t="შეკვეთები არ გაქვს" s="დააჭირე ზედა ღილაკს" /> : (
              <div className="col">
                {orders.map((o) => <OrderCard key={o.id} o={o} onOpen={() => setOpenId(o.id)} />)}
              </div>
            )}
        </div>
      )}

      {tab === "profile" && (
        <div style={{ padding: 16 }}>
          <div className="card tick">
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.full_name}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {profile.user_type === "company" ? "კომპანია" : "ფიზიკური პირი"} · {profile.phone}
            </div>
            <div className="hl" />
            <Row l="სულ შეკვეთა" v={(orders || []).length} mono />
            <Row l="დასრულებული" v={done.length} mono />
          </div>
          <button className="btn2 btn-danger" style={{ marginTop: 14 }} onClick={signOut}>გასვლა</button>
        </div>
      )}

      </div>

      <div className="nav">
        <button className={`navbtn ${tab === "orders" ? "on" : ""}`} onClick={() => setTab("orders")}>
          <Icon name="doc" />ჩემი შეკვეთები
        </button>
        <button className="navbtn" onClick={() => setShowNew(true)}>
          <Icon name="plus" />შეკვეთა
        </button>
        <button className={`navbtn ${tab === "profile" ? "on" : ""}`} onClick={() => setTab("profile")}>
          <Icon name="user" />პროფილი
        </button>
      </div>

      {showNew && <NewOrder busy={busy} onClose={() => setShowNew(false)} onPublish={publish} />}
      {openId && <OrderSheet orderId={openId} me={profile} toast={toast}
        onClose={() => { setOpenId(null); load(); }} onChanged={load} />}
    </>
  );
}

function OrderCard({ o, onOpen }) {
  const [bidCount, setBidCount] = useState(null);
  useEffect(() => {
    if (o.status !== "open") return;
    supabase.from("bids").select("id", { count: "exact", head: true }).eq("order_id", o.id)
      .then(({ count }) => setBidCount(count ?? 0));
  }, [o.id, o.status]);

  return (
    <button className="card tick" style={{ textAlign: "left", width: "100%", cursor: "pointer" }} onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="mono muted" style={{ fontSize: 11 }}>#{o.num}</span>
        <Pill s={o.status} />
      </div>
      <div style={{ fontWeight: 700 }}>{o.service}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{o.place} · {m2(o.area)}</div>
      {o.selected_bid_id && (
        <div style={{ marginTop: 5 }}><PayPill s={o.payment_status || "unpaid"} /></div>
      )}
      {o.status === "open" && bidCount !== null && (
        <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--safety)", fontWeight: 600 }}>
          {bidCount} შეთავაზება
        </div>
      )}
    </button>
  );
}

function OrderSheet({ orderId, me, onClose, onChanged, toast }) {
  const [o, setO] = useState(null);
  const [bids, setBids] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [profMap, setProfMap] = useState({});
  const [profileOpen, setProfileOpen] = useState(null);
  const [complaining, setComplaining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState(false);

  const load = useCallback(async () => {
    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    setO(order);
    if (!order) return;

    // დამკვეთი ხედავს ყველა შეთავაზებას — ამას RLS უშვებს მხოლოდ შეკვეთის მფლობელს
    const { data: bs } = await supabase.from("bids").select("*").eq("order_id", orderId).order("price");
    setBids(bs || []);

    const ids = [...new Set((bs || []).map((b) => b.surveyor_id))];
    if (ids.length) {
      const [{ data: profs }, { data: sts }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,verified,user_type").in("id", ids),
        supabase.from("surveyor_stats").select("*").in("id", ids),
      ]);
      setProfMap(Object.fromEntries((profs || []).map((p) => [p.id, p])));
      setStatsMap(Object.fromEntries((sts || []).map((s) => [s.id, s])));
    }
    const { data: myRating } = await supabase.from("ratings").select("id")
      .eq("order_id", orderId).eq("from_id", me.id).maybeSingle();
    setRated(Boolean(myRating));
  }, [orderId, me.id]);

  useEffect(() => { load(); }, [load]);

  const choose = async (bid) => {
    setBusy(true);
    const { error } = await supabase.from("orders")
      .update({ selected_bid_id: bid.id, status: "selected" }).eq("id", orderId);
    setBusy(false);
    if (error) { toast("არჩევა ვერ მოხერხდა"); return; }
    toast(`${profMap[bid.surveyor_id]?.full_name || "ამზომველი"} არჩეულია`);
    load(); onChanged();
  };

  const submitRating = async (r) => {
    const sel = bids.find((b) => b.id === o.selected_bid_id);
    if (!sel) return;
    setBusy(true);
    const { error } = await supabase.from("ratings").insert({
      order_id: orderId, from_id: me.id, to_id: sel.surveyor_id, ...r,
    });
    if (!error) await supabase.from("orders").update({ status: "rated" }).eq("id", orderId);
    setBusy(false);
    if (error) { toast("შეფასება ვერ გაიგზავნა"); return; }
    toast("შეფასება გაიგზავნა"); load(); onChanged();
  };

  const removeOrder = async () => {
    if (!confirm("შეკვეთა სამუდამოდ წაიშლება. გავაგრძელო?")) return;
    setBusy(true);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    setBusy(false);
    if (error) { toast("წაშლა ვერ მოხერხდა"); return; }
    toast("შეკვეთა წაიშალა");
    onChanged(); onClose();
  };

  const cancelOrder = async () => {
    if (!confirm("შეკვეთა გაუქმდება. გავაგრძელო?")) return;
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: "cancel" }).eq("id", orderId);
    setBusy(false);
    if (error) { toast("ვერ გაუქმდა"); return; }
    toast("შეკვეთა გაუქმდა"); load(); onChanged();
  };

  const markDone = async () => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: "done" }).eq("id", orderId);
    setBusy(false);
    if (error) { toast("ვერ დასრულდა"); return; }
    toast("სამუშაო დასრულებულად მოინიშნა"); load(); onChanged();
  };

  const complain = async (kind) => {
    const { error } = await supabase.from("complaints")
      .insert({ order_id: orderId, by_id: me.id, kind });
    setComplaining(false);
    toast(error ? "ვერ გაიგზავნა" : "Support-ს გაეგზავნა");
  };

  if (profileOpen) return <SurveyorProfile surveyorId={profileOpen} onClose={() => setProfileOpen(null)} />;

  return (
    <Sheet title={o ? `შეკვეთა #${o.num}` : "შეკვეთა"} onClose={onClose}>
      {!o ? <Spinner /> : (
        <>
          <div style={{ marginBottom: 10 }}><Pill s={o.status} /></div>

          <div className="card" style={{ marginBottom: 10 }}>
            <Row l="მომსახურება" v={o.service} />
            <Row l="მდებარეობა" v={o.place} />
            {o.cadastral_code && <Row l="საკ. კოდი" v={o.cadastral_code} mono />}
            <Row l="ფართობი" v={m2(o.area)} mono />
            <Row l="სასურველი ვადა" v={o.deadline} />
            <Row l="ფოტოები" v={(o.photos || []).length} mono />
          </div>

          {(o.lat || o.polygon) && (
            <div style={{ marginBottom: 10 }}>
              <div className="lbl" style={{ marginBottom: 4 }}>ადგილმდებარეობა</div>
              <MapView lat={o.lat} lng={o.lng} polygon={o.polygon} height={200} />
            </div>
          )}

          {o.status === "open" && (
            <>
              <div className="lbl" style={{ marginBottom: 6 }}>შეთავაზებები — ხედავ მხოლოდ შენ</div>
              {bids.length === 0 ? (
                <Empty t="ჯერ შეთავაზება არ არის" s="ამზომველებს შეკვეთა უკვე გამოუჩნდათ" />
              ) : bids.map((b) => {
                const p = profMap[b.surveyor_id] || {};
                const st = statsMap[b.surveyor_id] || {};
                return (
                  <div key={b.id} className="card tick" style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <button style={{ background: "none", border: "none", textAlign: "left", padding: 0, cursor: "pointer" }}
                        onClick={() => setProfileOpen(b.surveyor_id)}>
                        <div style={{ fontWeight: 700, color: "var(--marker)", textDecoration: "underline" }}>
                          {p.full_name} {p.verified && <span style={{ color: "var(--field)" }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 12 }}>
                          <Stars v={st.avg_rating} /> {Number(st.avg_rating || 0).toFixed(1)} · {st.completed_jobs ?? 0} სამუშაო
                        </div>
                      </button>
                      <div style={{ textAlign: "right" }}>
                        <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{money(b.price)}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{b.days} დღე</div>
                      </div>
                    </div>
                    {b.comment && <div style={{ fontSize: 13, marginTop: 6, fontStyle: "italic" }}>„{b.comment}"</div>}
                    <button className="btn btn-sm" style={{ width: "100%", marginTop: 8 }}
                      disabled={busy} onClick={() => choose(b)}>ამზომველის არჩევა</button>
                  </div>
                );
              })}

              <div className="hl" />
              <button className="btn2 btn-danger" disabled={busy} onClick={removeOrder}>
                შეკვეთის წაშლა
              </button>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                {bids.length > 0
                  ? `წაშლისას ${bids.length} შეთავაზებაც წაიშლება.`
                  : "შეკვეთა ჯერ არავის აურჩევია — უსაფრთხოდ იშლება."}
              </div>
            </>
          )}

          {o.selected_bid_id && (() => {
            const b = bids.find((x) => x.id === o.selected_bid_id);
            const p = b ? profMap[b.surveyor_id] : null;
            if (!b) return null;
            return (
              <>
                <div className="card tick" style={{ marginBottom: 10 }}>
                  <div className="lbl">არჩეული ამზომველი</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <button style={{ background: "none", border: "none", padding: 0, fontWeight: 700,
                      color: "var(--marker)", textDecoration: "underline", cursor: "pointer" }}
                      onClick={() => setProfileOpen(b.surveyor_id)}>{p?.full_name}</button>
                    <span className="mono" style={{ fontWeight: 700 }}>{money(b.price)} · {b.days} დღე</span>
                  </div>
                </div>

                <div className="lbl" style={{ marginBottom: 4 }}>სამუშაოს პროგრესი</div>
                <div className="wrap" style={{ marginBottom: 10 }}>
                  {FLOW.slice(1).map((s) => {
                    const reached = FLOW.indexOf(o.status) >= FLOW.indexOf(s);
                    return <span key={s} className={`pill ${reached ? STATUS[s].cls : ""}`}
                      style={reached ? {} : { color: "var(--black)" }}>{STATUS[s].label}</span>;
                  })}
                </div>

                <div style={{ marginTop: 12, marginBottom: 12 }}>
                  <Payment order={o} amount={b.price} meId={me.id} toast={toast}
                    onChanged={() => { load(); onChanged(); }} />
                </div>

                <div className="lbl" style={{ marginBottom: 4 }}>ნახაზები და დოკუმენტები</div>
                <div style={{ marginBottom: 12 }}>
                  <DeliverablesDownload orderId={orderId}
                    isPaid={o.payment_status === "confirmed"} toast={toast} />
                </div>

                {["scheduled", "inprogress", "processing"].includes(o.status) && (
                  <button className="btn btn-go" style={{ marginBottom: 10 }}
                    disabled={busy} onClick={markDone}>
                    სამუშაო დასრულებულად მონიშვნა
                  </button>
                )}

                {o.status === "done" && !rated && (
                  <RateForm who={p?.full_name} busy={busy} onSubmit={submitRating} />
                )}
                {(o.status === "rated" || rated) && (
                  <div className="card" style={{ marginBottom: 10, color: "var(--field)", fontSize: 13 }}>
                    შეფასება გაგზავნილია. მადლობა.
                  </div>
                )}

                <div className="lbl" style={{ marginTop: 12, marginBottom: 4 }}>ჩატი — {p?.full_name}</div>
                <div className="card"><Chat orderId={orderId} meId={me.id} place={o.place} /></div>

                {!["rated", "cancel"].includes(o.status) && (
                  <button className="btn2 btn-sm btn-danger" style={{ marginTop: 12 }}
                    onClick={() => setComplaining(true)}>პრობლემის შეტყობინება</button>
                )}
                {complaining && (
                  <div className="card" style={{ marginTop: 8 }}>
                    {COMPLAINT_KINDS.map((k) => (
                      <button key={k} className="chip" style={{ width: "100%", marginBottom: 4 }}
                        onClick={() => complain(k)}>{k}</button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </Sheet>
  );
}
