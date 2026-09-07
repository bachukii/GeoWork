import React, { useState, useEffect, useCallback } from "react";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Pill, Row, Empty, Stars, Sheet, Spinner } from "../components/UI";
import Chat from "../components/Chat";
import MapView from "../components/MapView";
import { DeliverablesUpload } from "../components/Deliverables";
import { PayPill } from "../components/Payment";
import Countdown from "../components/Countdown";
import { money, m2, FLOW, STATUS, REGIONS, ALL_SERVICES } from "../lib/constants";

export default function SurveyorView({ toast }) {
  const { profile, signOut, updateProfile } = useAuth();
  const [tab, setTab] = useState("home");
  const [feed, setFeed] = useState(null);
  const [myBids, setMyBids] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [bidOrders, setBidOrders] = useState({});   // order_id -> order

  const load = useCallback(async () => {
    // ღია შეკვეთები — ფილტრი რეგიონსა და მომსახურებაზე
    const regions = profile.regions?.length ? profile.regions : REGIONS;
    const services = profile.services?.length ? profile.services : ALL_SERVICES;

    const [{ data: open }, { data: bs }, { data: st }] = await Promise.all([
      supabase.from("orders").select("*").eq("status", "open")
        .in("region", regions).in("service", services).order("created_at", { ascending: false }),
      supabase.from("bids").select("*").eq("surveyor_id", profile.id),
      supabase.from("surveyor_stats").select("*").eq("id", profile.id).maybeSingle(),
    ]);
    setFeed(open || []);
    setMyBids(bs || []);
    setStats(st);

    // ჩემი ბიდების შეკვეთები — სახელის საჩვენებლად სიაში
    const orderIds = [...new Set((bs || []).map((b) => b.order_id))];
    if (orderIds.length) {
      const { data: os } = await supabase.from("orders")
        .select("id,num,service,place,status,due_at,selected_bid_id").in("id", orderIds);
      setBidOrders(Object.fromEntries((os || []).map((o) => [o.id, o])));
    } else setBidOrders({});

    // სამუშაოები სადაც ეს ამზომველია არჩეული
    const bidIds = (bs || []).map((b) => b.id);
    if (bidIds.length) {
      const { data: won } = await supabase.from("orders").select("*").in("selected_bid_id", bidIds)
        .order("created_at", { ascending: false });
      setMyOrders(won || []);
    } else setMyOrders([]);
  }, [profile.id, profile.regions, profile.services]);

  useEffect(() => { load(); }, [load]);

  const active = myOrders.filter((o) => !["rated", "cancel"].includes(o.status));
  const finished = myOrders.filter((o) => ["done", "rated"].includes(o.status));
  const income = finished.reduce((a, o) => {
    const b = myBids.find((x) => x.id === o.selected_bid_id);
    return a + Number(b?.price || 0);
  }, 0);
  const bidOn = (orderId) => myBids.find((b) => b.order_id === orderId);

  const Card = ({ o }) => {
    const b = bidOn(o.id);
    return (
      <button className="card tick" style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
        onClick={() => setOpenId(o.id)}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 6 }}>
          <span className="mono muted" style={{ fontSize: 11 }}>#{o.num}</span>
          {o.status === "open"
            ? (b ? <span className="pill s-selected">{money(b.price)} გაგზავნილია</span>
                 : <span className="pill s-open">ახალი</span>)
            : <Pill s={o.status} />}
        </div>
        <div style={{ fontWeight: 700 }}>{o.service}</div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          {o.place} · {m2(o.area)} · {(o.photos || []).length} · ⏱ {o.deadline}
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="shell-body">
      {tab === "home" && (
        <div style={{ padding: 16 }}>
          {!profile.verified && (
            <div className="warn" style={{ marginBottom: 12 }}>
              პროფილი ვერიფიკაციის მოლოდინშია. შეთავაზებების გაგზავნა შეგიძლია,
              მაგრამ „Verified ✓" ნიშანი ჯერ არ გაქვს.
            </div>
          )}
          <div className="card tick" style={{ marginBottom: 12 }}>
            <div className="grid3">
              <div className="stat"><div className="n mono" style={{ color: "var(--safety)" }}>{feed?.length ?? "—"}</div><div className="t">ახალი შეკვეთა</div></div>
              <div className="stat"><div className="n mono">{myBids.length}</div><div className="t">გაგზავნილი</div></div>
              <div className="stat"><div className="n mono" style={{ color: "var(--field)" }}>{myOrders.length}</div><div className="t">მოგებული</div></div>
            </div>
            <div className="hl" />
            <div className="grid3">
              <div className="stat"><div className="n mono">{active.length}</div><div className="t">მიმდინარე</div></div>
              <div className="stat"><div className="n mono">{stats?.completed_jobs ?? 0}</div><div className="t">დასრულებული</div></div>
              <div className="stat"><div className="n"><span className="star">★</span>{Number(stats?.avg_rating || 0).toFixed(1)}</div><div className="t">რეიტინგი</div></div>
            </div>
            <div className="hl" />
            <Row l="შემოსავალი (პლატფორმიდან)" v={money(income)} mono />
          </div>
        </div>
      )}

      {tab === "feed" && (
        <div style={{ padding: 16 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>
            შეკვეთები — {(profile.regions || []).join(", ") || "ყველა რეგიონი"}
          </div>
          {feed === null ? <Spinner /> :
            feed.length === 0 ? <Empty t="ახალი შეკვეთა არ არის" s="შეამოწმე რეგიონები და მომსახურებები პროფილში" /> :
              <div className="col">{feed.map((o) => <Card key={o.id} o={o} />)}</div>}
        </div>
      )}

      {tab === "jobs" && (
        <div style={{ padding: 16 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>მიმდინარე სამუშაოები</div>
          {active.length === 0 ? <Empty t="მიმდინარე სამუშაო არ არის" />
            : <div className="col">{active.map((o) => <Card key={o.id} o={o} />)}</div>}

          <div className="lbl" style={{ margin: "16px 0 8px" }}>ჩემი შეთავაზებები</div>
          {myBids.length === 0 ? <Empty t="შეთავაზება ჯერ არ გაგიგზავნია" /> : (
            <div className="col">
              {myBids.map((b) => {
                const ord = bidOrders[b.order_id];
                const won = ord && ord.selected_bid_id === b.id;
                const lost = ord && ord.selected_bid_id && !won;
                return (
                  <button key={b.id} className="card" style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
                    onClick={() => setOpenId(b.order_id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        {ord && <div style={{ fontWeight: 600, fontSize: 14 }}>{ord.service}</div>}
                        <div className="mono muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {ord ? `#${ord.num} · ` : ""}{money(b.price)} · {b.days} დღე
                        </div>
                      </div>
                      <span className={`pill ${won ? "s-done" : lost ? "s-cancel" : "s-open"}`}>
                        {won ? "მოგებული" : lost ? "ვერ მოიგე" : "მოლოდინში"}
                      </span>
                    </div>
                    {won && ord?.due_at && !["done", "rated", "cancel"].includes(ord.status) && (
                      <div style={{ marginTop: 8 }}><Countdown due={ord.due_at} compact /></div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "profile" && (
        <div style={{ padding: 16 }}>
          <ProfileEditor profile={profile} stats={stats} onSave={updateProfile} toast={toast} />
          <button className="btn2 btn-danger" style={{ marginTop: 14 }} onClick={signOut}>გასვლა</button>
        </div>
      )}

      </div>

      <div className="nav">
        <button className={`navbtn ${tab === "home" ? "on" : ""}`} onClick={() => setTab("home")}><Icon name="home" />მთავარი</button>
        <button className={`navbtn ${tab === "feed" ? "on" : ""}`} onClick={() => setTab("feed")}>
          <Icon name="feed" />შეკვეთები{feed?.length ? ` (${feed.length})` : ""}
        </button>
        <button className={`navbtn ${tab === "jobs" ? "on" : ""}`} onClick={() => setTab("jobs")}><Icon name="ruler" />სამუშაოები</button>
        <button className={`navbtn ${tab === "profile" ? "on" : ""}`} onClick={() => setTab("profile")}><Icon name="user" />პროფილი</button>
      </div>

      {openId && <OrderSheet orderId={openId} me={profile} toast={toast}
        onClose={() => { setOpenId(null); load(); }} onChanged={load} />}
    </>
  );
}

function ProfileEditor({ profile, stats, onSave, toast }) {
  const [regions, setRegions] = useState(profile.regions || []);
  const [services, setServices] = useState(profile.services || []);
  const [bio, setBio] = useState(profile.bio || "");
  const [busy, setBusy] = useState(false);
  const dirty =
    JSON.stringify(regions) !== JSON.stringify(profile.regions || []) ||
    JSON.stringify(services) !== JSON.stringify(profile.services || []) ||
    bio !== (profile.bio || "");

  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div>
      <div className="card tick" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {profile.full_name}{" "}
          {profile.verified
            ? <span style={{ color: "var(--field)", fontSize: 13 }}>Verified</span>
            : <span style={{ color: "var(--safety)", fontSize: 12 }}>ვერიფიკაცია მოლოდინში</span>}
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          {profile.user_type === "company" ? "კომპანია" : "გეოდეზისტი"} · {profile.experience} წელი · {profile.phone}
        </div>
        <div style={{ marginTop: 6 }}>
          <Stars v={stats?.avg_rating} /> {Number(stats?.avg_rating || 0).toFixed(1)} · {stats?.completed_jobs ?? 0} სამუშაო
        </div>
      </div>

      <div className="lbl" style={{ marginBottom: 4 }}>სამუშაო რეგიონები</div>
      <div className="wrap" style={{ marginBottom: 12 }}>
        {REGIONS.map((r) => (
          <button key={r} className={`chip chip-sm ${regions.includes(r) ? "on" : ""}`}
            onClick={() => tog(regions, setRegions, r)}>{r}</button>
        ))}
      </div>

      <div className="lbl" style={{ marginBottom: 4 }}>მომსახურებები</div>
      <div className="wrap" style={{ marginBottom: 12 }}>
        {ALL_SERVICES.map((s) => (
          <button key={s} className={`chip chip-sm ${services.includes(s) ? "on" : ""}`}
            onClick={() => tog(services, setServices, s)}>{s}</button>
        ))}
      </div>

      <div className="lbl">აღწერა</div>
      <textarea className="inp" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />

      <button className="btn" style={{ marginTop: 12 }} disabled={!dirty || busy}
        onClick={async () => {
          setBusy(true);
          try { await onSave({ regions, services, bio: bio.trim() || null }); toast("პროფილი განახლდა"); }
          catch { toast("შენახვა ვერ მოხერხდა"); }
          finally { setBusy(false); }
        }}>
        {busy ? "ინახება…" : "ცვლილებების შენახვა"}
      </button>
    </div>
  );
}

function OrderSheet({ orderId, me, onClose, onChanged, toast }) {
  const [o, setO] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [othersCount, setOthersCount] = useState(0);
  const [client, setClient] = useState(null);
  const [form, setForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    setO(order);
    if (!order) { setDenied(true); return; }
    setDenied(false);

    // RLS-ის გამო აქ მხოლოდ ჩემი შეთავაზება დაბრუნდება — სხვისას ვერ წავიკითხავ
    const { data: mine } = await supabase.from("bids").select("*")
      .eq("order_id", orderId).eq("surveyor_id", me.id).maybeSingle();
    setMyBid(mine);

    // კონკურენტების მხოლოდ რაოდენობა, ფასების გარეშე
    const { count } = await supabase.from("bids")
      .select("id", { count: "exact", head: true }).eq("order_id", orderId);
    setOthersCount(Math.max(0, (count ?? 0) - (mine ? 1 : 0)));

    const { data: c } = await supabase.from("profiles").select("id,full_name")
      .eq("id", order.client_id).maybeSingle();
    setClient(c);
  }, [orderId, me.id]);

  useEffect(() => { load(); }, [load]);

  const sendBid = async (payload) => {
    setBusy(true);
    const { error } = await supabase.from("bids")
      .insert({ order_id: orderId, surveyor_id: me.id, ...payload });
    setBusy(false);
    if (error) { toast("შეთავაზება ვერ გაიგზავნა"); return; }
    setForm(false); toast("შეთავაზება გაიგზავნა"); load(); onChanged();
  };

  const advance = async () => {
    const i = FLOW.indexOf(o.status);
    const next = FLOW[i + 1];
    if (!next || next === "rated") return;
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
    if (error) { toast("სტატუსი ვერ შეიცვალა"); return; }
    load(); onChanged();
  };

  const isMine = o?.selected_bid_id && myBid && o.selected_bid_id === myBid.id;

  return (
    <Sheet title={o ? `შეკვეთა #${o.num}` : "შეკვეთა"} onClose={onClose}>
      {denied ? (
        <div className="card" style={{ fontSize: 13.5 }}>
          ამ შეკვეთის ნახვა ვეღარ შეგიძლია — დამკვეთმა სხვა ამზომველი აირჩია
          ან შეკვეთა გაუქმდა.
        </div>
      ) : !o ? <Spinner /> : (
        <>
          <div style={{ marginBottom: 10 }}><Pill s={o.status} /></div>

          <div className="card" style={{ marginBottom: 10 }}>
            <Row l="მომსახურება" v={o.service} />
            <Row l="მდებარეობა" v={o.place} />
            {o.cadastral_code && <Row l="საკ. კოდი" v={o.cadastral_code} mono />}
            <Row l="ფართობი" v={`${m2(o.area)}${o.area_source === "manual" ? " (მიახლ.)" : ""}`} mono />
            <Row l="სასურველი ვადა" v={o.deadline} />
            <Row l="დამკვეთი" v={client?.full_name || "—"} />
          </div>

          {(o.lat || o.polygon) && (
            <div style={{ marginBottom: 10 }}>
              <div className="lbl" style={{ marginBottom: 4 }}>სამუშაოს ადგილი</div>
              <MapView lat={o.lat} lng={o.lng} polygon={o.polygon} height={220} />
            </div>
          )}

          {o.description && (
            <div className="card" style={{ marginBottom: 10, fontSize: 13.5, fontStyle: "italic" }}>
              „{o.description}"
            </div>
          )}

          {(o.photos || []).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 10 }}>
              {o.photos.map((p, i) => (
                <div key={i} style={{ aspectRatio: "1", background: "#C4C7C0", border: "1px solid var(--black)",
                  fontSize: 9, padding: 3, overflow: "hidden", color: "var(--graphite)" }}>{p}</div>
              ))}
            </div>
          )}

          {o.status === "open" && (
            myBid ? (
              <div className="card tick">
                <div className="lbl">შენი შეთავაზება</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
                  {money(myBid.price)} · {myBid.days} დღე
                </div>
                {myBid.comment && <div style={{ fontSize: 13, fontStyle: "italic" }}>„{myBid.comment}"</div>}
                <div className="hl" />
                <div className="muted" style={{ fontSize: 12 }}>
                  სხვა შეთავაზება: {othersCount} — ფასები დახურულია. სერვერი ვერავის აძლევს
                  სხვისი ფასის წაკითხვის უფლებას, მხოლოდ დამკვეთი ხედავს ყველას.
                </div>
              </div>
            ) : form ? (
              <BidForm busy={busy} onCancel={() => setForm(false)} onSend={sendBid} />
            ) : (
              <>
                <div className="card" style={{ marginBottom: 10, fontSize: 12.5 }} >
                  ამ შეკვეთაზე უკვე გაგზავნილია <b>{othersCount}</b> შეთავაზება.
                  მათ ფასებს ვერ ხედავ — და ვერც ისინი ხედავენ შენსას.
                  შეაფასე საკუთარი გამოცდილებით.
                </div>
                <button className="btn btn-go" onClick={() => setForm(true)}>ფასის შეთავაზება</button>
              </>
            )
          )}

          {o.status !== "open" && !isMine && (
            <div className="card" style={{ color: "var(--survey)", fontSize: 13 }}>
              დამკვეთმა სხვა ამზომველი აირჩია.
            </div>
          )}

          {isMine && (
            <>
              <div className="card tick" style={{ marginBottom: 10 }}>
                <Row l="შეთანხმებული ფასი" v={money(myBid.price)} mono />
                <Row l="ვადა" v={`${myBid.days} დღე`} mono />
                {o.due_at && !["done", "rated", "cancel"].includes(o.status) && (
                  <div className="row" style={{ alignItems: "center", marginTop: 4 }}>
                    <span className="muted">დარჩენილი დრო</span>
                    <Countdown due={o.due_at} />
                  </div>
                )}
                <div className="hl" />
                <div className="row" style={{ alignItems: "center" }}>
                  <span className="muted">გადახდა</span>
                  <PayPill s={o.payment_status || "unpaid"} />
                </div>
              </div>

              <div className="lbl" style={{ marginBottom: 4 }}>ნახაზის მიწოდება</div>
              <div className="card" style={{ marginBottom: 12 }}>
                <DeliverablesUpload orderId={orderId} meId={me.id} toast={toast} />
              </div>

              {FLOW.indexOf(o.status) < FLOW.indexOf("done") && (
                <button className="btn" style={{ marginBottom: 10 }} onClick={advance}>
                  → {STATUS[FLOW[FLOW.indexOf(o.status) + 1]].label}
                </button>
              )}
              {o.status === "done" && (
                <div className="card" style={{ marginBottom: 10, fontSize: 13, color: "var(--field)" }}>
                  დასრულებულია — ველოდებით დამკვეთის შეფასებას
                </div>
              )}

              <div className="lbl" style={{ marginBottom: 4 }}>ჩატი — {client?.full_name}</div>
              <div className="card"><Chat orderId={orderId} meId={me.id} place={o.place} /></div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

function BidForm({ onSend, onCancel, busy }) {
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("2");
  const [comment, setComment] = useState("");
  return (
    <div className="card tick">
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="lbl">ფასი (₾)</div>
          <input className="inp mono" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="420" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="lbl">ვადა (დღე)</div>
          <input className="inp mono" type="number" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
      </div>
      <div className="lbl" style={{ marginTop: 8 }}>კომენტარი</div>
      <input className="inp" value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="სამუშაოს შესრულება შემიძლია ხვალ დილით." />
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button className="btn2" onClick={onCancel}>გაუქმება</button>
        <button className="btn" disabled={busy || !price || Number(price) <= 0}
          onClick={() => onSend({ price: Number(price), days: Number(days) || 1, comment: comment.trim() || null })}>
          {busy ? "იგზავნება…" : "გაგზავნა"}
        </button>
      </div>
    </div>
  );
}
