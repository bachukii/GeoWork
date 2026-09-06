import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { REGIONS, ALL_SERVICES } from "../lib/constants";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("landing"); // landing | login | reg-client | reg-surveyor
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  if (mode === "landing") return <Landing onPick={setMode} />;
  if (mode === "login")
    return <Login onBack={() => setMode("landing")} busy={busy} err={err}
      onSubmit={async (v) => {
        setErr(""); setBusy(true);
        try { await signIn(v); } catch (e) { setErr(translate(e)); } finally { setBusy(false); }
      }} />;

  const role = mode === "reg-client" ? "client" : "surveyor";
  return (
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
function Landing({ onPick }) {
  return (
    <div>
      <div className="gate-hero">
        <h1 className="mark">ამზომველს<br />ეძებ?<br /><span>დაელოდე<br />ფასებს.</span></h1>
        <p className="lede">
          აქვეყნებ სამუშაოს. ამზომველები გიგზავნიან ფასს ერთმანეთისგან დამოუკიდებლად —
          ვერავინ ხედავს ვინ რამდენი დაწერა. ირჩევ შენ.
        </p>
      </div>
      <div className="hazard" />

      <div style={{ padding: 16 }}>
        <div className="col">
          <div className="role-card">
            <div className="glyph">🏗</div>
            <h2>დამკვეთი ვარ</h2>
            <p>მჭირდება საკადასტრო, ტოპოგრაფიული ან შიდა აზომვა.</p>
            <button className="btn btn-go" onClick={() => onPick("reg-client")}>
              შეკვეთის განთავსება
            </button>
          </div>

          <div className="role-card">
            <div className="glyph">📐</div>
            <h2>ამზომველი ვარ</h2>
            <p>გეოდეზისტი ან კომპანია. ვიღებ შეკვეთებს ჩემს რეგიონში.</p>
            <button className="btn" onClick={() => onPick("reg-surveyor")}>
              ამზომველად რეგისტრაცია
            </button>
          </div>
        </div>

        <div className="hl" style={{ margin: "18px 0" }} />
        <button className="btn2" onClick={() => onPick("login")}>შესვლა</button>
      </div>
    </div>
  );
}

// ---------------- LOGIN ----------------
function Login({ onBack, onSubmit, busy, err }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ padding: 20 }}>
      <button className="btn2 btn-sm" style={{ marginBottom: 18 }} onClick={onBack}>← უკან</button>
      <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.02em" }}>შესვლა</div>
      {err && <div className="err">{err}</div>}
      <div className="lbl">ელფოსტა</div>
      <input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="lbl" style={{ marginTop: 10 }}>პაროლი</div>
      <input className="inp" type="password" autoComplete="current-password" value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && email && password && onSubmit({ email, password })} />
      <button className="btn btn-go" style={{ marginTop: 20 }} disabled={busy || !email || !password}
        onClick={() => onSubmit({ email, password })}>
        {busy ? "შესვლა…" : "შესვლა"}
      </button>
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
    <div style={{ padding: 20 }}>
      <button className="btn2 btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← უკან</button>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
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
          <input className="inp" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} />

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
