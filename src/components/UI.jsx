import React from "react";
import { STATUS } from "../lib/constants";

export const Pill = ({ s }) => {
  const m = STATUS[s] || STATUS.open;
  return <span className={`pill ${m.cls}`}>{m.icon} {m.label}</span>;
};

export const Row = ({ l, v, mono }) => (
  <div className="row">
    <span className="muted">{l}</span>
    <span className={mono ? "mono" : ""} style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
  </div>
);

export const Empty = ({ t, s }) => (
  <div className="center">
    <div style={{ fontSize: 14 }}>{t}</div>
    {s && <div style={{ fontSize: 12.5, marginTop: 4 }}>{s}</div>}
  </div>
);

export const Stars = ({ v }) => {
  const n = Math.round(Number(v) || 0);
  return (
    <span className="star">
      {"★".repeat(n)}
      <span style={{ color: "var(--line)" }}>{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
};

export function Sheet({ title, onClose, children }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "var(--slate)", cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ text = "იტვირთება…" }) {
  return <div className="center" style={{ fontSize: 13 }}>{text}</div>;
}
