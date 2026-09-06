import React from "react";

// GeoBid-ის ნიშანი — ტრიანგულაციის ქსელი.
// გეოდეზიაში სამკუთხედი საბაზისო ფიგურაა: სამი წერტილი, სამი ხაზი,
// ერთი გაზომილი ბაზისი. აქ ის ერთდროულად ნიშნავს „გაზომვას" და
// „სამ მხარეს": დამკვეთი, ამზომველი, პლატფორმა.
export function Mark({ size = 28, light = false }) {
  const line = light ? "#F4F6F3" : "var(--navy)";
  const dot = "var(--gold)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4 L28 26 L4 26 Z" fill="none" stroke={line} strokeWidth="2.5"
        strokeLinejoin="round" />
      <path d="M16 4 L16 26" stroke={line} strokeWidth="1.2" opacity=".45" />
      <circle cx="16" cy="4"  r="3.4" fill={dot} stroke={line} strokeWidth="1.6" />
      <circle cx="28" cy="26" r="3.4" fill={dot} stroke={line} strokeWidth="1.6" />
      <circle cx="4"  cy="26" r="3.4" fill={dot} stroke={line} strokeWidth="1.6" />
    </svg>
  );
}

export default function Logo({ size = 26, light = false, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <Mark size={size + 6} light={light} />
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontSize: size, fontWeight: 900, letterSpacing: "-0.025em",
          color: light ? "#F4F6F3" : "var(--navy)",
        }}>
          Geo<span style={{ color: "var(--gold)" }}>Bid</span>
        </div>
        {sub && (
          <div style={{
            fontSize: 10.5, marginTop: 3, fontWeight: 600,
            color: light ? "rgba(244,246,243,.65)" : "var(--graphite)",
          }}>{sub}</div>
        )}
      </div>
    </div>
  );
}
