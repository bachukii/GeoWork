import React from "react";
import { BASEMAPS, cadastreAvailable } from "../lib/basemaps";

// რუკის ფენების გადამრთველი
export default function LayerSwitch({ base, setBase, cadastre, setCadastre }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
      {Object.entries(BASEMAPS).map(([k, v]) => (
        <button key={k} className={`chip chip-sm ${base === k ? "on" : ""}`}
          onClick={() => setBase(k)}>{v.label}</button>
      ))}
      {cadastreAvailable && (
        <button className={`chip chip-sm ${cadastre ? "on" : ""}`}
          onClick={() => setCadastre(!cadastre)}>ნაკვეთები</button>
      )}
    </div>
  );
}
