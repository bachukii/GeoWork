import React, { useState } from "react";
import { SERVICES, REGIONS } from "./content";
import { SITE } from "./config";

// განაცხადი იგზავნება Netlify Forms-ში (სახელი "order").
// Netlify ფორმას index.html-ში არსებული დამალული ასლით პოულობს — ველები
// ორივეგან ერთნაირი უნდა იყოს.
const EMPTY = { name: "", phone: "", service: "", region: "", code: "", message: "" };

const encode = (data) =>
  Object.keys(data).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k])).join("&");

export default function OrderForm({ initialService = "" }) {
  const [f, setF] = useState({ ...EMPTY, service: initialService });
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const phoneOk = f.phone.replace(/\D/g, "").length >= 9;
  const valid = f.name.trim() && phoneOk && f.service && f.region;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode({ "form-name": "order", "bot-field": "", ...f }),
      });
      if (!res.ok) throw new Error(res.status);
      setState("done");
      setF({ ...EMPTY });
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="sf-done">
        <div className="sf-done-t">განაცხადი მიღებულია ✓</div>
        <p>მალე დაგიკავშირდებით მითითებულ ნომერზე. თუ სასწრაფოა, დაგვირეკე: <a href={SITE.phoneHref}>{SITE.phone}</a></p>
        <button className="btn2 btn-sm" onClick={() => setState("idle")}>კიდევ ერთი განაცხადი</button>
      </div>
    );
  }

  return (
    <form className="sf" name="order" onSubmit={submit} noValidate>
      <p hidden><label>არ შეავსო: <input name="bot-field" /></label></p>

      <div className="sf-row">
        <label className="sf-f">
          <span className="lbl">სახელი *</span>
          <input className="inp" name="name" autoComplete="name" value={f.name} onChange={set("name")} />
        </label>
        <label className="sf-f">
          <span className="lbl">ტელეფონი *</span>
          <input className="inp" name="phone" type="tel" autoComplete="tel" placeholder="5XX XX XX XX"
            value={f.phone} onChange={set("phone")} />
        </label>
      </div>

      <div className="sf-row">
        <label className="sf-f">
          <span className="lbl">მომსახურება *</span>
          <select className="inp" name="service" value={f.service} onChange={set("service")}>
            <option value="">აირჩიე…</option>
            {SERVICES.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
          </select>
        </label>
        <label className="sf-f">
          <span className="lbl">რეგიონი *</span>
          <select className="inp" name="region" value={f.region} onChange={set("region")}>
            <option value="">აირჩიე…</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <label className="sf-f">
        <span className="lbl">საკადასტრო კოდი ან მისამართი</span>
        <input className="inp" name="code" placeholder="მაგ. 01.10.14.012.034" value={f.code} onChange={set("code")} />
      </label>

      <label className="sf-f">
        <span className="lbl">დამატებითი ინფორმაცია</span>
        <textarea className="inp" name="message" rows={4} placeholder="ფართობი, ვადა, სხვა დეტალები…"
          value={f.message} onChange={set("message")} />
      </label>

      {state === "error" && (
        <div className="err">ვერ გაიგზავნა. სცადე თავიდან ან დაგვირეკე: {SITE.phone}</div>
      )}

      <button className="btn btn-go" type="submit" disabled={!valid || state === "sending"}>
        {state === "sending" ? "იგზავნება…" : "განაცხადის გაგზავნა"}
      </button>
      <div className="sf-note">* სავალდებულო ველები. განაცხადი უფასოა და ვალდებულებას არ გაკისრებს.</div>
    </form>
  );
}
