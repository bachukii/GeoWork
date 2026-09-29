import React from "react";

// GeoBid-ის ნიშანი. სამი ვარიანტი — აქტიურია LOGO_VARIANT.
//  target  — გეოდეზიური ნიშნული (ოთხად გაყოფილი წრე + ჯვარედინი ხაზი)
//  pin     — რუკის ნიშანი ტრიანგულაციის სამკუთხედით
//  reticle — ხელსაწყოს სამიზნე ბადე
export const LOGO_VARIANT = "target";

const NAVY = "var(--navy)";
const GOLD = "var(--gold)";
const PAPER = "#F4F6F3";

function Target({ size, light }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill={NAVY}
        stroke={light ? "rgba(255,255,255,.28)" : "none"} strokeWidth="1" />
      <path d="M16 3.5v5M16 23.5v5M3.5 16h5M23.5 16h5" stroke={PAPER} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="7.5" fill={PAPER} />
      <path d="M16 16V8.5A7.5 7.5 0 0 1 23.5 16Z M16 16v7.5A7.5 7.5 0 0 1 8.5 16Z" fill={GOLD} />
      <circle cx="16" cy="16" r="7.5" fill="none" stroke={NAVY} strokeWidth="1.2" />
    </svg>
  );
}

function Pin({ size, light }) {
  const body = light ? PAPER : NAVY;
  const inner = light ? NAVY : PAPER;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 30.5S4.5 19.6 4.5 12a11.5 11.5 0 0 1 23 0c0 7.6-11.5 18.5-11.5 18.5z" fill={body} />
      <path d="M16 6.2 21.6 16H10.4Z" fill="none" stroke={inner} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="16" cy="6.2" r="2.1" fill={GOLD} />
      <circle cx="21.6" cy="16" r="2.1" fill={GOLD} />
      <circle cx="10.4" cy="16" r="2.1" fill={GOLD} />
    </svg>
  );
}

function Reticle({ size, light }) {
  const line = light ? PAPER : NAVY;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="none" stroke={line} strokeWidth="2.2" />
      <path d="M16 1.5v8M16 22.5v8M1.5 16h8M22.5 16h8" stroke={line} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 11.5v1.5M16 19v1.5M11.5 16h1.5M19 16h1.5" stroke={line} strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
      <circle cx="16" cy="16" r="2.8" fill={GOLD} />
    </svg>
  );
}

const MARKS = { target: Target, pin: Pin, reticle: Reticle };

export function Mark({ size = 28, light = false, variant = LOGO_VARIANT }) {
  const M = MARKS[variant] || Target;
  return <M size={size} light={light} />;
}

export default function Logo({ size = 26, light = false, sub, variant }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.38) }}>
      <Mark size={Math.round(size * 1.35)} light={light} variant={variant} />
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontSize: size, fontWeight: 800, letterSpacing: "-0.03em",
          color: light ? PAPER : NAVY,
        }}>
          Geo<span style={{ color: GOLD }}>Bid</span>
        </div>
        {sub && (
          <div style={{
            fontSize: Math.max(10, size * 0.42), marginTop: 4, fontWeight: 600, letterSpacing: ".01em",
            color: light ? "rgba(244,246,243,.65)" : "var(--muted)",
          }}>{sub}</div>
        )}
      </div>
    </div>
  );
}
