import React, { useState, useRef, useCallback } from "react";
import { Sheet, Row } from "./UI";
import MapPicker from "./MapPicker";
import { SERVICE_GROUPS, REGIONS, DEADLINES, m2 } from "../lib/constants";
import { lookupCadastral } from "../lib/cadastral";

export default function NewOrder({ onClose, onPublish, busy }) {
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState(null);
  const [svc, setSvc] = useState(null);
  const [mode, setMode] = useState("code");
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState(undefined); // undefined = not searched
  const [manualArea, setManualArea] = useState(0);
  const [geo, setGeo] = useState({ lat: null, lng: null, polygon: null });
  const [manualRegion, setManualRegion] = useState(REGIONS[0]);
  const [manualAddr, setManualAddr] = useState("");
  const [photos, setPhotos] = useState([]);
  const [desc, setDesc] = useState("");
  const [dl, setDl] = useState(DEADLINES[1]);
  const [dlDate, setDlDate] = useState("");
  const fileRef = useRef();

  const onGeo = useCallback((g) => {
    setGeo(g);
    if (g.area) setManualArea(g.area);
  }, []);

  const canNext =
    step === 1 ? !!svc :
    step === 2 ? (mode === "code" ? !!lookup : (geo.lat !== null || manualArea > 0)) : true;

  const region = mode === "code" ? lookup?.region : manualRegion;
  const place = mode === "code" ? lookup?.place : (manualAddr.trim() || manualRegion);
  const area = mode === "code" ? lookup?.area : manualArea;

  const publish = () => onPublish({
    category: cat, service: svc, region, place,
    cadastral_code: mode === "code" ? code.trim() : null,
    area, area_source: mode === "code" ? "cadastral" : "manual",
    lat: geo.lat, lng: geo.lng, polygon: geo.polygon,
    photos, description: desc.trim() || null,
    deadline: dl === "კონკრეტული თარიღი" ? (dlDate || dl) : dl,
  });

  return (
    <Sheet title={`ახალი შეკვეთა · ნაბიჯი ${step}/4`} onClose={onClose}>
      {step === 1 && (
        <div>
          <div className="lbl">მომსახურების კატეგორია</div>
          <div className="grid2" style={{ marginTop: 6, marginBottom: 14 }}>
            {Object.keys(SERVICE_GROUPS).map((k) => (
              <button key={k} className={`chip ${cat === k ? "on" : ""}`}
                onClick={() => { setCat(k); setSvc(null); }}>{k}</button>
            ))}
          </div>
          {cat && (
            <>
              <div className="lbl">კონკრეტული სამუშაო</div>
              <div className="col" style={{ marginTop: 6 }}>
                {SERVICE_GROUPS[cat].map((s) => (
                  <button key={s} className={`chip ${svc === s ? "on" : ""}`} onClick={() => setSvc(s)}>{s}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="grid2" style={{ marginBottom: 12 }}>
            <button className={`chip ${mode === "code" ? "on" : ""}`} onClick={() => setMode("code")}>საკადასტრო კოდი მაქვს</button>
            <button className={`chip ${mode === "manual" ? "on" : ""}`} onClick={() => setMode("manual")}>რუკაზე მოვნიშნავ</button>
          </div>

          {mode === "code" ? (
            <div>
              <div className="lbl">საკადასტრო კოდი</div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <input className="inp mono" placeholder="01.72.14.031.045" value={code}
                  onChange={(e) => { setCode(e.target.value); setLookup(undefined); }} />
                <button className="btn btn-sm" style={{ marginTop: 4, whiteSpace: "nowrap" }}
                  onClick={() => setLookup(lookupCadastral(code))}>ძებნა</button>
              </div>
              {lookup === null && (
                <div style={{ fontSize: 12, color: "var(--survey)", marginTop: 6 }}>
                  კოდი ვერ მოიძებნა. ფორმატი: XX.XX.XX.XXX ან XX.XX.XX.XXX.XXX
                </div>
              )}
              {lookup && (
                <div className="card tick" style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>ნაკვეთი ნაპოვნია</div>
                  <Row l="ფართობი" v={m2(lookup.area)} mono />
                  <Row l="მდებარეობა" v={lookup.place} />
                  <svg viewBox="0 0 300 120" style={{ width: "100%", marginTop: 8, background: "#C4C7C0", border: "1px solid var(--black)" }}>
                    <polygon points="60,20 230,30 245,95 80,105" fill="rgba(228,255,26,.35)" stroke="var(--black)" strokeWidth="2.5" />
                    {[[60,20],[230,30],[245,95],[80,105]].map(([x,y],i) => (
                      <circle key={i} cx={x} cy={y} r="4" fill="var(--hivis)" stroke="var(--black)" strokeWidth="2" />
                    ))}
                  </svg>
                  <div className="warn" style={{ marginTop: 8 }}>
                    ⚠️ დემო-მონაცემი. რეალური NAPR-ის მოთხოვნა ჯერ არ არის ჩართული.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="lbl">რეგიონი</div>
              <select className="inp" value={manualRegion} onChange={(e) => setManualRegion(e.target.value)}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <div className="lbl" style={{ marginTop: 10 }}>მისამართი / ორიენტირი</div>
              <input className="inp" value={manualAddr} onChange={(e) => setManualAddr(e.target.value)} placeholder="სოფელი, ქუჩა…" />
              <div className="lbl" style={{ marginTop: 12, marginBottom: 4 }}>რუკაზე მონიშვნა</div>
              <MapPicker onChange={onGeo} height={280} />
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="lbl">ფოტოები და დოკუმენტები</div>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf" style={{ display: "none" }}
            onChange={(e) => setPhotos((p) => [...p, ...Array.from(e.target.files).map((f) => f.name)])} />
          <button className="btn2" style={{ marginTop: 6 }} onClick={() => fileRef.current.click()}>
            📷 ფოტოს / ფაილის დამატება
          </button>
          {photos.length > 0 && (
            <div className="wrap" style={{ marginTop: 8 }}>
              {photos.map((p, i) => (
                <span key={i} className="pill" style={{ color: "var(--black)" }}>
                  {p.length > 18 ? p.slice(0, 16) + "…" : p}
                  <button style={{ background: "none", border: "none", color: "var(--survey)", cursor: "pointer" }}
                    onClick={() => setPhotos((ph) => ph.filter((_, j) => j !== i))}>✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="warn" style={{ marginTop: 8 }}>
            ⚠️ ამჟამად ინახება მხოლოდ ფაილის სახელი. რეალური ატვირთვისთვის
            Supabase Storage bucket უნდა ჩაირთოს (README-ში წერია როგორ).
          </div>

          <div className="lbl" style={{ marginTop: 14 }}>დამატებითი ინფორმაცია</div>
          <textarea className="inp" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="მაგ: მჭირდება მშენებლობისთვის. ნაკვეთზე დგას ძველი სახლი." />

          <div className="lbl" style={{ marginTop: 14 }}>სასურველი ვადა</div>
          <div className="grid2" style={{ marginTop: 6 }}>
            {DEADLINES.map((d) => (
              <button key={d} className={`chip ${dl === d ? "on" : ""}`} onClick={() => setDl(d)}>{d}</button>
            ))}
          </div>
          {dl === "კონკრეტული თარიღი" && (
            <input className="inp" type="date" value={dlDate} onChange={(e) => setDlDate(e.target.value)} />
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="card tick" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>შეკვეთის შეჯამება</div>
            <Row l="მომსახურება" v={svc} />
            <Row l="მდებარეობა" v={place} />
            {mode === "code" && <Row l="საკადასტრო კოდი" v={code} mono />}
            <Row l="ფართობი" v={`${m2(area)}${mode === "manual" ? " (≈)" : ""}`} mono />
            <Row l="ფოტოები" v={photos.length} mono />
            {geo.lat && <Row l="კოორდინატები" v={`${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`} mono />}
            {geo.polygon && <Row l="კონტური" v={`${geo.polygon.length} წერტილი`} mono />}
            <Row l="სასურველი ვადა" v={dl === "კონკრეტული თარიღი" ? (dlDate || "—") : dl} />
          </div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            შეკვეთა გამოუჩნდებათ ამზომველებს, რომლებიც <b>{region}</b>-ში მუშაობენ და
            <b> {svc}</b>-ს ასრულებენ. თითოეული დამოუკიდებლად შემოგთავაზებს ფასს —
            ისინი ერთმანეთის ფასებს <b>ვერ ხედავენ</b>.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {step > 1 && <button className="btn2" onClick={() => setStep((s) => s - 1)}>უკან</button>}
        {step < 4
          ? <button className="btn" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>შემდეგი</button>
          : <button className="btn btn-go" disabled={busy} onClick={publish}>{busy ? "ქვეყნდება…" : "შეკვეთის გამოქვეყნება"}</button>}
      </div>
    </Sheet>
  );
}
