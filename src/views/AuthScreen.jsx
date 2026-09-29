import React, { useState } from "react";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { REGIONS, ALL_SERVICES } from "../lib/constants";
import Logo from "../components/Logo";
import TriGrid from "../components/TriGrid";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("landing"); // landing | login | reg-client | reg-surveyor
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  if (mode === "landing") return <Landing onPick={setMode} />;
  if (mode === "login")
    return (
      <AuthFrame onHome={() => setMode("landing")}>
        <Login onBack={() => setMode("landing")} busy={busy} err={err}
          onSwitch={() => { setErr(""); setMode("reg-client"); }}
          onSubmit={async (v) => {
            setErr(""); setBusy(true);
            try { await signIn(v); } catch (e) { setErr(translate(e)); } finally { setBusy(false); }
          }} />
      </AuthFrame>
    );

  const role = mode === "reg-client" ? "client" : "surveyor";
  return (
    <AuthFrame onHome={() => setMode("landing")}>
    <Register
      role={role}
      busy={busy} err={err} info={info}
      onBack={() => { setErr(""); setInfo(""); setMode("landing"); }}
      onSubmit={async (payload) => {
        setErr(""); setInfo(""); setBusy(true);
        try {
          const res = await signUp({ ...payload, role });
          if (res.needsConfirmation) {
            setInfo("რეგისტრაცია მიღებულია. დაადასტურე ელფოსტა და შემდეგ შედი სისტემაში.");
          }
        } catch (e) { setErr(translate(e)); } finally { setBusy(false); }
      }}
    />
    </AuthFrame>
  );
}

// პაროლის ველი ჩვენების ღილაკით
function PasswordInput({ value, onChange, autoComplete = "current-password", onEnter }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        className="inp"
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        style={{ paddingRight: 46 }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "პაროლის დამალვა" : "პაროლის ჩვენება"}
        title={show ? "დამალვა" : "ჩვენება"}
        style={{
          position: "absolute", right: 1, top: 6, bottom: 1, width: 42,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--muted)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 0,
        }}>
        <Icon name={show ? "eyeOff" : "eye"} size={19} />
      </button>
    </div>
  );
}

function translate(e) {
  const m = String(e?.message || e);
  if (/already registered|already exists/i.test(m)) return "ეს ელფოსტა უკვე დარეგისტრირებულია.";
  if (/Invalid login credentials/i.test(m)) return "ელფოსტა ან პაროლი არასწორია.";
  if (/Password should be at least/i.test(m)) return "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.";
  if (/duplicate key/i.test(m)) return "პროფილი უკვე არსებობს.";
  return m;
}

// ---------------- LANDING ----------------
// მაგალითის მონაცემები — მხოლოდ ილუსტრაციისთვის
const DEMO_BIDS = [
  { who: "ნ. ბერიძე", tag: "Verified", stars: "4.9", days: 2, price: 280 },
  { who: "GeoLine LLC", tag: "Verified", stars: "4.8", days: 1, price: 340 },
  { who: "ლ. კაპანაძე", tag: "", stars: "4.6", days: 3, price: 250 },
];

const STEPS = [
  { n: "01", t: "აქვეყნებ შეკვეთას", d: "საკადასტრო კოდით ან რუკაზე მონიშვნით. ნაკვეთის საზღვრები საჯარო რეესტრიდან ავტომატურად ჩამოდის." },
  { n: "02", t: "იღებ დახურულ ფასებს", d: "ამზომველები ფასს ერთმანეთისგან დამოუკიდებლად გიგზავნიან. ერთმანეთის შეთავაზებას ვერავინ ხედავს." },
  { n: "03", t: "ირჩევ და იღებ ნახაზს", d: "ადარებ ფასს, ვადას და რეიტინგს. ნახაზს PDF/DWG ფორმატში პირდაპირ პლატფორმაზე იღებ." },
];

const TRUST = [
  { icon: "lock", t: "დახურული ფასები", d: "დაცულია ბაზის დონეზე — არა მხოლოდ ინტერფეისში." },
  { icon: "pin", t: "საჯარო რეესტრის რუკა", d: "საკადასტრო ნაკვეთი, ორთოფოტო და სატელიტი ერთ ეკრანზე." },
  { icon: "check", t: "ვერიფიცირებული ამზომველები", d: "პროფილს ადმინისტრატორი ამოწმებს; შეფასებას მხოლოდ დამკვეთი წერს." },
];

function Landing({ onPick }) {
  return (
    <div className="lp">
      <header className="lp-hero">
        <TriGrid />
        <div className="lp-wrap lp-top">
          <Logo size={24} light />
          <button className="lp-ghost" onClick={() => onPick("login")}>შესვლა</button>
        </div>

        <div className="lp-wrap lp-hero-grid">
          <div>
            <div className="lp-kicker">გეოდეზიური მომსახურების ბაზარი</div>
            <h1 className="lp-h1">ამზომველს ეძებ?<br /><span>დაელოდე ფასებს.</span></h1>
            <p className="lp-lede">
              აქვეყნებ სამუშაოს. ამზომველები გიგზავნიან ფასს ერთმანეთისგან
              დამოუკიდებლად — ვერავინ ხედავს, ვინ რამდენი დაწერა. ირჩევ შენ.
            </p>
            <div className="lp-cta">
              <button className="btn btn-go" onClick={() => onPick("reg-client")}>შეკვეთის განთავსება</button>
              <button className="lp-ghost lp-ghost-lg" onClick={() => onPick("reg-surveyor")}>ამზომველი ვარ</button>
            </div>
          </div>

          <div className="lp-demo" aria-label="მაგალითი: შეთავაზებები შეკვეთაზე">
            <div className="lp-demo-hdr">
              <div>
                <div className="lp-demo-t">საკადასტრო აზომვა</div>
                <div className="lp-demo-s">მცხეთა · 850 მ² · <span className="mono">72.16.01.123</span></div>
              </div>
              <span className="lp-pill">3 შეთავაზება</span>
            </div>
            {DEMO_BIDS.map((b, i) => (
              <div className={`lp-bid ${i === 0 ? "best" : ""}`} key={b.who}>
                <div className="lp-av">{b.who.replace(/[^\p{L}]/gu, "").slice(0, 1)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="lp-bid-who">{b.who}{b.tag && <em>{b.tag}</em>}</div>
                  <div className="lp-bid-meta">★ {b.stars} · {b.days} დღე</div>
                </div>
                <div className="lp-bid-price mono">{b.price} ₾</div>
              </div>
            ))}
            <div className="lp-demo-foot">
              <Icon name="lock" size={14} /> თითო ამზომველი მხოლოდ საკუთარ ფასს ხედავს
            </div>
            <div className="lp-demo-tag">მაგალითი</div>
          </div>
        </div>
      </header>

      <section className="lp-wrap lp-sec">
        <h2 className="lp-h2">როგორ მუშაობს</h2>
        <div className="lp-steps">
          {STEPS.map((x) => (
            <div className="lp-step" key={x.n}>
              <div className="lp-step-n mono">{x.n}</div>
              <h3>{x.t}</h3>
              <p>{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-wrap lp-sec" style={{ paddingTop: 0 }}>
        <div className="lp-roles">
          <div className="role-card">
            <div className="glyph"><Icon name="doc" size={26} /></div>
            <h2>დამკვეთი ვარ</h2>
            <p>მჭირდება საკადასტრო, ტოპოგრაფიული ან შიდა აზომვა.</p>
            <ul className="lp-list">
              <li>რეგისტრაცია — 1 წუთი</li>
              <li>შეთავაზებების შედარება ერთ ეკრანზე</li>
              <li>ჩატი არჩეულ ამზომველთან</li>
            </ul>
            <button className="btn btn-go" onClick={() => onPick("reg-client")}>შეკვეთის განთავსება</button>
          </div>

          <div className="role-card">
            <div className="glyph"><Icon name="ruler" size={26} /></div>
            <h2>ამზომველი ვარ</h2>
            <p>გეოდეზისტი ან კომპანია. ვიღებ შეკვეთებს ჩემს რეგიონში.</p>
            <ul className="lp-list">
              <li>შეკვეთები მხოლოდ შენს რეგიონებში</li>
              <li>ნავიგაცია ობიექტამდე ერთი დაჭერით</li>
              <li>შენს ფასს კონკურენტი ვერ ნახავს</li>
            </ul>
            <button className="btn" onClick={() => onPick("reg-surveyor")}>ამზომველად რეგისტრაცია</button>
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap lp-trust">
          {TRUST.map((x) => (
            <div key={x.t} className="lp-trust-i">
              <Icon name={x.icon} size={20} />
              <div><b>{x.t}</b><span>{x.d}</span></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="lp-wrap lp-foot">
        <Logo size={16} />
        <span className="muted">GeoBid — GEOID-ის პროდუქტი</span>
        <button className="lp-link" onClick={() => onPick("login")}>შესვლა</button>
      </footer>
    </div>
  );
}

// შესვლა / რეგისტრაცია: ფართო ეკრანზე ორი სვეტი
function AuthFrame({ children, onHome }) {
  return (
    <div className="af">
      <aside className="af-side">
        <TriGrid />
        <button className="af-logo" onClick={onHome} aria-label="მთავარი გვერდი">
          <Logo size={24} light />
        </button>
        <div className="af-copy">
          <div className="lp-h1 af-h">ამზომველს ეძებ?<br /><span>დაელოდე ფასებს.</span></div>
          <ul className="af-points">
            {TRUST.map((x) => (
              <li key={x.t}><Icon name={x.icon} size={16} /> {x.t}</li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="af-main">
        <div className="af-form">{children}</div>
      </main>
    </div>
  );
}

// ---------------- LOGIN ----------------
function Login({ onBack, onSubmit, onSwitch, busy, err }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div>
      <button className="btn2 btn-sm" style={{ marginBottom: 18 }} onClick={onBack}>უკან</button>
      <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.02em" }}>შესვლა</div>
      {err && <div className="err">{err}</div>}
      <div className="lbl">ელფოსტა</div>
      <input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="lbl" style={{ marginTop: 10 }}>პაროლი</div>
      <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
        onEnter={() => email && password && onSubmit({ email, password })} />
      <button className="btn btn-go" style={{ marginTop: 20 }} disabled={busy || !email || !password}
        onClick={() => onSubmit({ email, password })}>
        {busy ? "შესვლა…" : "შესვლა"}
      </button>
      <div className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: 16 }}>
        ანგარიში არ გაქვს? <button className="lp-link" onClick={onSwitch}>რეგისტრაცია</button>
      </div>
    </div>
  );
}

// ---------------- REGISTER ----------------
function Register({ role, onBack, onSubmit, busy, err, info }) {
  const isSurveyor = role === "surveyor";
  const [step, setStep] = useState(1);
  const steps = isSurveyor ? 3 : 1;

  const [f, setF] = useState({
    email: "", password: "",
    fullName: "", phone: "", userType: "individual",
    companyName: "", companyId: "", website: "",
    experience: "3", bio: "", regions: [], services: [],
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k, v) => setF((x) => ({
    ...x, [k]: x[k].includes(v) ? x[k].filter((a) => a !== v) : [...x[k], v],
  }));

  const step1Valid = f.email.includes("@") && f.password.length >= 6 && f.fullName.trim() && f.phone.trim();
  const step2Valid = f.regions.length > 0 && f.services.length > 0;
  const canSubmit = isSurveyor ? (step1Valid && step2Valid) : step1Valid;

  return (
    <div>
      <button className="btn2 btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>უკან</button>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15, whiteSpace: "pre-line" }}>
        {isSurveyor ? "ამზომველის\nრეგისტრაცია" : "დამკვეთის\nრეგისტრაცია"}
      </div>
      {isSurveyor && <div className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>ნაბიჯი {step} / {steps}</div>}
      <div style={{ height: 10 }} />

      {err && <div className="err">{err}</div>}
      {info && <div className="ok">{info}</div>}

      {step === 1 && (
        <div>
          <div className="lbl">ტიპი</div>
          <div className="grid2" style={{ marginTop: 6, marginBottom: 12 }}>
            <button className={`chip ${f.userType === "individual" ? "on" : ""}`}
              onClick={() => set("userType", "individual")}>
              {isSurveyor ? "ინდივიდუალური" : "ფიზიკური პირი"}
            </button>
            <button className={`chip ${f.userType === "company" ? "on" : ""}`}
              onClick={() => set("userType", "company")}>კომპანია</button>
          </div>

          <div className="lbl">{f.userType === "company" ? "კომპანიის სახელი" : "სახელი და გვარი"}</div>
          <input className="inp" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />

          {f.userType === "company" && (
            <>
              <div className="lbl" style={{ marginTop: 10 }}>საიდენტიფიკაციო ნომერი</div>
              <input className="inp mono" value={f.companyId} onChange={(e) => set("companyId", e.target.value)} />
              <div className="lbl" style={{ marginTop: 10 }}>ვებგვერდი (სურვილისამებრ)</div>
              <input className="inp" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            </>
          )}

          <div className="lbl" style={{ marginTop: 10 }}>ტელეფონი</div>
          <input className="inp" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="5XX XX XX XX" />

          <div className="lbl" style={{ marginTop: 10 }}>ელფოსტა</div>
          <input className="inp" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />

          <div className="lbl" style={{ marginTop: 10 }}>პაროლი (მინ. 6 სიმბოლო)</div>
          <PasswordInput value={f.password} autoComplete="new-password"
            onChange={(e) => set("password", e.target.value)} />
          {f.password.length > 0 && f.password.length < 6 && (
            <div style={{ fontSize: 11.5, color: "var(--bad)", marginTop: 5 }}>
              კიდევ {6 - f.password.length} სიმბოლო
            </div>
          )}

          {isSurveyor && (
            <>
              <div className="lbl" style={{ marginTop: 10 }}>გამოცდილება (წელი)</div>
              <input className="inp mono" type="number" value={f.experience} onChange={(e) => set("experience", e.target.value)} />
            </>
          )}

          <div className="warn" style={{ marginTop: 12 }}>
            ტელეფონის SMS-დადასტურება ჯერ არ არის ჩართული — ავტორიზაცია ელფოსტით ხდება.
            SMS-ის ჩასართავად Supabase-ში Twilio/MessageBird უნდა დაუკავშირდეს.
          </div>
        </div>
      )}

      {isSurveyor && step === 2 && (
        <div>
          <div className="lbl" style={{ marginBottom: 6 }}>სამუშაო რეგიონები</div>
          <div className="wrap" style={{ marginBottom: 16 }}>
            {REGIONS.map((r) => (
              <button key={r} className={`chip chip-sm ${f.regions.includes(r) ? "on" : ""}`}
                onClick={() => toggle("regions", r)}>{r}</button>
            ))}
          </div>
          <div className="lbl" style={{ marginBottom: 6 }}>მომსახურებები</div>
          <div className="wrap">
            {ALL_SERVICES.map((s) => (
              <button key={s} className={`chip chip-sm ${f.services.includes(s) ? "on" : ""}`}
                onClick={() => toggle("services", s)}>{s}</button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
            მხოლოდ შერჩეული რეგიონებისა და მომსახურებების შეკვეთები გამოგიჩნდება.
          </div>
        </div>
      )}

      {isSurveyor && step === 3 && (
        <div>
          <div className="lbl">აღწერა</div>
          <textarea className="inp" rows={4} value={f.bio} onChange={(e) => set("bio", e.target.value)}
            placeholder="გამოცდილება, აღჭურვილობა, სპეციალიზაცია…" />
          <div className="card" style={{ marginTop: 12, fontSize: 12.5 }}>
            <b>ვერიფიკაცია</b>
            <div className="muted" style={{ marginTop: 4 }}>
              რეგისტრაციის შემდეგ პროფილი გადის ადმინისტრატორის შემოწმებას.
              ვერიფიკაციამდე შეკვეთებს ხედავ და შეთავაზებას აგზავნი, მაგრამ
              „Verified ✓" ნიშანი პროფილზე არ გექნება.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {step > 1 && <button className="btn2" onClick={() => setStep((s) => s - 1)}>უკან</button>}
        {isSurveyor && step < steps ? (
          <button className="btn" disabled={step === 1 ? !step1Valid : !step2Valid}
            onClick={() => setStep((s) => s + 1)}>შემდეგი</button>
        ) : (
          <button className="btn" disabled={busy || !canSubmit} onClick={() => onSubmit({
            email: f.email.trim(), password: f.password, fields: f,
          })}>
            {busy ? "მიმდინარეობს…" : "რეგისტრაცია"}
          </button>
        )}
      </div>
    </div>
  );
}
