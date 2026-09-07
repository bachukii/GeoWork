import React, { useState, useEffect } from "react";

// ვადის ათვლა — ცოცხლად განახლებადი.
// წუთზე ერთხელ ახლდება (წამობრივი ტიკი აქ არაფერს მატებს).
export default function Countdown({ due, compact = false }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!due) return null;

  const target = new Date(due).getTime();
  if (Number.isNaN(target)) return null;

  const diff = target - now;
  const over = diff < 0;
  const abs = Math.abs(diff);

  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);

  let text;
  if (d > 0) text = `${d} დღე ${h} სთ`;
  else if (h > 0) text = `${h} სთ ${m} წთ`;
  else text = `${m} წთ`;

  // ფერი სისწრაფის მიხედვით
  const cls = over ? "s-cancel" : d >= 2 ? "s-done" : d >= 1 ? "s-scheduled" : "s-cancel";
  const label = over ? `ვადა გადაცილდა — ${text}` : `დარჩა ${text}`;

  if (compact) {
    return <span className={`pill ${cls}`}>{over ? "+" : ""}{text}</span>;
  }

  return (
    <div className={`pill ${cls}`} style={{ fontSize: 12.5, padding: "5px 10px" }}>
      {label}
    </div>
  );
}
