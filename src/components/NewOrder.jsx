import React, { useState, useCallback } from "react";
import Icon from "./Icon";
import { Sheet, Row } from "./UI";
import MapPicker from "./MapPicker";
import { PhotoUpload } from "./Photos";
import { isValidCode, findParcelByCode, findText } from "../lib/napr";
import { SERVICE_GROUPS, REGIONS, DEADLINES, m2 } from "../lib/constants";

export default function NewOrder({ onClose, onPublish, busy, ownerId }) {
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState(null);
  const [svc, setSvc] = useState(null);
  const [code, setCode] = useState("");
  const [geo, setGeo] = useState({ lat: null, lng: null, polygon: null, area: 0 });
  const [region, setRegion] = useState(REGIONS[0]);
  const [addr, setAddr] = useState("");
  const [photos, setPhotos] = useState([]);
  const [folderId] = useState(() => crypto.randomUUID());
  const [desc, setDesc] = useState("");
  const [dl, setDl] = useState(DEADLINES[1]);
  const [dlDate, setDlDate] = useState("");

  const onGeo = useCallback((g) => setGeo(g), []);

  // კოდით ძებნა საჯარო რეესტრში → ნაკვეთი რუკაზე
  const [found, setFound] = useState(null);     // { outer, bbox, area, code }
  const [finding, setFinding] = useState(false);
  const [findMsg, setFindMsg] = useState(null);  // { kind, text }
  const findCode = async () => {
    setFinding(true); setFindMsg(null);
    const r = await findParcelByCode(code).catch(() => ({ ok: false, reason: "blocked" }));
    setFinding(false);
    if (r.ok) {
      setFound(r.parcel);
      if (r.parcel.code) setCode(r.parcel.code);
      setFindMsg({ kind: "ok", text: `ნაკვეთი ნაპოვნია${r.parcel.area ? ` · ${m2(r.parcel.area)}` : ""}` });
    } else {
      setFindMsg({ kind: "warn", text: findText[r.reason] || findText.blocked, detail: r.detail });
    }
  };

  const codeOk = isValidCode(code);
  const canNext =
    step === 1 ? !!svc :
    step === 2 ? (codeOk || geo.lat !== null || geo.area > 0) : true;

  const place = addr.trim() || region;
  const area = geo.area || 0;

  const publish = () => onPublish({
    category: cat, service: svc, region, place,
    cadastral_code: code.trim() || null,
    area: found?.area || area, area_source: found?.area ? "cadastral" : "manual",
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
          <form className="mp-search" style={{ marginTop: 6, marginBottom: 0 }}
            onSubmit={(e) => { e.preventDefault(); if (codeOk) findCode(); }}>
            <input className="inp mono" placeholder="01.72.14.031.045" value={code}
              onChange={(e) => { setCode(e.target.value); setFindMsg(null); }} />
            <button className="btn btn-go" type="submit" disabled={!codeOk || finding}>
              {finding ? "იძებნება…" : "ძებნა"}
            </button>
          </form>
          {findMsg && (
            <div className={findMsg.kind} style={{ marginTop: 8, marginBottom: 0 }}>
              {findMsg.text}
              {findMsg.detail && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: "pointer", fontSize: 11.5 }}>ტექნიკური დეტალები</summary>
                  <div className="mono" style={{ fontSize: 10.5, marginTop: 4, wordBreak: "break-all" }}>
                    {findMsg.detail.split(" | ").map((t, i) => <div key={i}>{t}</div>)}
                  </div>
                </details>
              )}
            </div>
          )}
          {code.trim() && !codeOk ? (
            <div style={{ fontSize: 11.5, marginTop: 5, color: "var(--warn)" }}>
              ფორმატი: 01.72.14.031.045 (ბინისთვის: 01.72.14.031.045.01.500)
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>
              კოდით ამზომველი ნაკვეთს საჯარო რეესტრში იპოვის. თუ არ იცი — მონიშნე ადგილი რუკაზე.
            </div>
          )}

          <div className="lbl" style={{ marginTop: 16, marginBottom: 6 }}>ადგილი რუკაზე</div>
          <MapPicker onChange={onGeo} parcel={found} height={320} />

          {(geo.area > 0 || codeOk) && (
            <div className="card tick" style={{ marginTop: 10 }}>
              {codeOk && <Row l="საკადასტრო კოდი" v={code.trim()} mono />}
              {found?.area
                ? <Row l="ფართობი (რეესტრი)" v={m2(found.area)} mono />
                : geo.area > 0 && <Row l="ფართობი (მიახლოებით)" v={m2(geo.area)} mono />}
            </div>
          )}
          {!canNext && (
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              გასაგრძელებლად ჩაწერე საკადასტრო კოდი ან მონიშნე ადგილი რუკაზე.
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
          <PhotoUpload ownerId={ownerId} folderId={folderId}
            value={photos} onChange={setPhotos} />

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
            {code.trim() && <Row l="საკადასტრო კოდი" v={code.trim()} mono />}
            {area > 0 && <Row l="ფართობი" v={`${m2(area)} (≈)`} mono />}
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
