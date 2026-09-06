import React, { useState, useEffect } from "react";

// ტერიტორიის მიახლოებითი მონიშვნა.
// ⚠️ ეს არის სქემატური ბადე, არა რეალური რუკა — მასშტაბი პირობითია.
// რეალურ ვერსიაში აქ Leaflet + OSM/ორთოფოტო ჩაჯდება და ფართობი
// გეოგრაფიული კოორდინატებიდან გამოითვლება.
const SCALE = 0.5; // 1px ≈ 0.5 მ

export default function AreaDraw({ onArea }) {
  const [pts, setPts] = useState([]);

  const area = (() => {
    if (pts.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return (Math.abs(a) / 2) * SCALE * SCALE;
  })();

  useEffect(() => { onArea(Math.round(area)); }, [area, onArea]);

  const click = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = 300 / r.width;
    setPts((p) => [...p, { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sx }]);
  };

  return (
    <div>
      <svg viewBox="0 0 300 200" onClick={click}
        style={{ width: "100%", background: "#E3E7DD", border: "1px solid var(--line)", touchAction: "manipulation" }}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#C9CEC0" strokeWidth=".6" />
          </pattern>
        </defs>
        <rect width="300" height="200" fill="url(#grid)" />
        {pts.length > 1 && (
          <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="rgba(46,92,134,.25)" stroke="var(--blue)" strokeWidth="1.5" />
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--amber)" stroke="var(--ink)" strokeWidth="1" />
        ))}
        {pts.length === 0 && (
          <text x="150" y="105" textAnchor="middle" fontSize="11" fill="#66727F">
            დააჭირე კუთხეების მოსანიშნად
          </text>
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
          ≈ {Math.round(area).toLocaleString("ka-GE")} მ²
        </span>
        <button className="btn2 btn-sm" onClick={() => setPts([])}>გასუფთავება</button>
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
        მითითებული ტერიტორია მიახლოებითია — საბოლოო ფართობს სპეციალისტი განსაზღვრავს.
      </div>
    </div>
  );
}
