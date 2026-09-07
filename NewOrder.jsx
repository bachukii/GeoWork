import React, { useState, useRef, useCallback } from "react";
import Icon from "./Icon";
import { Sheet, Row } from "./UI";
import MapPicker from "./MapPicker";
import { SERVICE_GROUPS, REGIONS, DEADLINES, m2 } from "../lib/constants";

export default function NewOrder({ onClose, onPublish, busy }) {
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState(null);
  const [svc, setSvc] = useState(null);
  const [code, setCode] = useState("");
  const [geo, setGeo] = useState({ lat: null, lng: null, polygon: null, area: 0, fromParcel: false });
  const [parcelCode, setParcelCode] = useState(null);
  const [region, setRegion] = useState(REGIONS[0]);
  const [addr, setAddr] = useState("");
  const [photos, setPhotos] = useState([]);
  const [desc, setDesc] = useState("");
  const [dl, setDl] = useState(DEADLINES[1]);
  const [dlDate, setDlDate] = useState("");
  const fileRef = useRef();

  const onGeo = useCallback((g) => {
    setGeo((prev) => ({ ...g, fromParcel: prev.fromParcel }));
  }, []);

  const onParcel = useCallback((p) => {
    setParcelCode(p.code || null);
    if (p.code) setCode(p.code);
    setGeo((prev) => ({ ...prev, fromParcel: true }));
  }, []);

  const canNext =
    step === 1 ? !!svc :
    step === 2 ? (geo.lat !== null || geo.area > 0) : true;

  const place = addr.trim() || region;
  const area = geo.area || 0;

  const publish = () => onPublish({
    category: cat, service: svc, region, place,
    cadastral_code: (parcelCode || code).trim() || null,
    area, area_source: geo.fromParcel ? "cadastral" : "manual",
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
          <div className="lbl">საკადასტრო კოდი</div>
          <input className="inp mono" placeholder="01.72.14.031.045" value={code}
            onChange={(e) => { setCode(e.target.value); setLookup(undefined); }} />
          <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>
            თუ კოდი გაქვს — ჩაწერე და რუკაზე „კოდით პოვნა" დააჭირე.
            თუ არა — მონიშნე ნაკვეთი რუკაზე დაჭერით ან დახაზე კონტური ხელით.
          </div>

          <div style={{ marginTop: 12 }}>
            <MapPicker onChange={onGeo} onParcelFound={onParcel} code={code.trim()} height={320} />
          </div>

          {geo.area > 0 && (
            <div className="card tick" style={{ marginTop: 10 }}>
              <Row l="ფართობი" v={m2(geo.area)} mono />
              {parcelCode && <Row l="საკადასტრო კოდი" v={parcelCode} mono />}
              <Row l="წყარო" v={geo.fromParcel ? "საჯარო რეესტრი" : "ხელით მონიშნული"} />
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="lbl">რეგიონი</div>
          <select className="inp" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>

          <div className="lbl" style={{ marginTop: 10 }}>მისამართი / ორიენტირი</div>
          <input className="inp" value={addr} onChange={(e) => setAddr(e.target.value)}
            placeholder="თბილისი, დიდი დიღომი…" />

          <div className="hl" />

          <div className="lbl">ფოტოები და დოკუმენტები</div>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf" style={{ display: "none" }}
            onChange={(e) => setPhotos((p) => [...p, ...Array.from(e.target.files).map((f) => f.name)])} />
          <button className="btn2" style={{ marginTop: 6 }} onClick={() => fileRef.current.click()}>
            ფოტოს / ფაილის დამატება
          </button>
          {photos.length > 0 && (
            <div className="wrap" style={{ marginTop: 8 }}>
              {photos.map((p, i) => (
                <span key={i} className="pill" style={{ color: "var(--black)" }}>
                  {p.length > 18 ? p.slice(0, 16) + "…" : p}
                  <button style={{ background: "none", border: "none", color: "var(--survey)", cursor: "pointer" }}
                    onClick={() => setPhotos((ph) => ph.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="warn" style={{ marginTop: 8 }}>
            ამჟამად ინახება მხოლოდ ფაილის სახელი. რეალური ატვირთვისთვის
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
            {(parcelCode || code) && <Row l="საკადასტრო კოდი" v={parcelCode || code} mono />}
            <Row l="ფართობი" v={`${m2(area)}${geo.fromParcel ? "" : " (≈)"}`} mono />
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
