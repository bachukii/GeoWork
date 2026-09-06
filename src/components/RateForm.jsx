import React, { useState } from "react";

const FIELDS = [
  ["overall", "საერთო"],
  ["communication", "კომუნიკაცია"],
  ["price", "ფასი"],
  ["timeliness", "დროულობა"],
  ["quality", "ხარისხი"],
];

export default function RateForm({ who, onSubmit, busy }) {
  const [v, setV] = useState({ overall: 5, communication: 5, price: 5, timeliness: 5, quality: 5 });
  const [comment, setComment] = useState("");

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>შეაფასე — {who}</div>
      {FIELDS.map(([k, l]) => (
        <div key={k} className="row" style={{ alignItems: "center", marginBottom: 4 }}>
          <span className="muted">{l}</span>
          <span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setV((x) => ({ ...x, [k]: n }))}
                style={{ background: "none", border: "none", fontSize: 19, cursor: "pointer",
                  color: n <= v[k] ? "var(--amber)" : "var(--line)" }}>★</button>
            ))}
          </span>
        </div>
      ))}
      <input className="inp" placeholder="კომენტარი (სურვილისამებრ)" value={comment}
        onChange={(e) => setComment(e.target.value)} />
      <button className="btn" style={{ marginTop: 10 }} disabled={busy}
        onClick={() => onSubmit({ ...v, comment: comment.trim() || null })}>
        {busy ? "იგზავნება…" : "შეფასების გაგზავნა"}
      </button>
    </div>
  );
}
