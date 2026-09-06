import React from "react";
import { STATUS } from "../lib/constants";

export const Pill = ({ s }) => {
  const m = STATUS[s] || STATUS.open;
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
};

export const Row = ({ l, v, mono }) => (
  <div className="row">
    <span className="muted">{l}</span>
    <span className={mono ? "mono" : ""} style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
  </div>
);

export const Empty = ({ t, s }) => (
  <div className="center">
    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--black)" }}>{t}</div>
    {s && <div style={{ fontSize: 13, marginTop: 5 }}>{s}</div>}
  </div>
);

export const Stars = ({ v }) => {
  const n = Math.round(Number(v) || 0);
  return (
    <span className="star">
      {"★".repeat(n)}
      <span style={{ color: "#B4B7B0" }}>{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
};

export function Sheet({ title, onClose, children }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="hazard" />
        <div className="sheet-hdr">
          <span className="t">{title}</span>
          <button onClick={onClose} aria-label="დახურვა">✕</button>
        </div>
        <div className="sheet-inner">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ text = "იტვირთება" }) {
  return <div className="center" style={{ fontSize: 13.5, fontWeight: 700 }}>{text}…</div>;
}
