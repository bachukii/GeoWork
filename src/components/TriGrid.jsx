import React from "react";

// ფონის ტრიანგულაციის ქსელი — ბრენდის ნიშნის გაგრძელება
export default function TriGrid() {
  return (
    <svg className="lp-grid" aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600">
      <defs>
        <pattern id="tri" width="120" height="104" patternUnits="userSpaceOnUse">
          <path d="M0 104 L60 0 L120 104 Z M60 0 L60 104" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1200" height="600" fill="url(#tri)" />
    </svg>
  );
}
