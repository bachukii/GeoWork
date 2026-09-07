import React from "react";

// ხაზოვანი ხატულები — ემოჯის ნაცვლად.
// ერთი სისუფთავე: 24px ბადე, 1.6 სისქე, მრგვალი ბოლოები.
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

const paths = {
  // ნახაზი / შეკვეთები
  doc: <><path d="M6 3h8l4 4v14H6z" {...P} /><path d="M14 3v4h4" {...P} /><path d="M9 12h6M9 16h4" {...P} /></>,
  // მთავარი — ხელსაწყო შტატივზე
  home: <><path d="M12 4v5" {...P} /><circle cx="12" cy="3" r="1.6" {...P} /><path d="M12 9 6 21M12 9l6 12M8.5 16h7" {...P} /></>,
  // შეკვეთების ფიდი — სიგნალი
  feed: <><path d="M12 5v14" {...P} /><path d="M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8" {...P} /><path d="M5 6a10 10 0 0 0 0 12M19 6a10 10 0 0 1 0 12" {...P} /></>,
  // სამუშაოები — კუთხის სახაზავი
  ruler: <><path d="M4 20 20 4" {...P} /><path d="M4 20h6M4 20v-6" {...P} /><path d="M9 15l2 2M12 12l2 2M15 9l2 2" {...P} /></>,
  // პროფილი
  user: <><circle cx="12" cy="8" r="3.6" {...P} /><path d="M5 20a7 7 0 0 1 14 0" {...P} /></>,
  // დამატება
  plus: <><path d="M12 6v12M6 12h12" {...P} /></>,
  // ფული
  money: <><rect x="3" y="6" width="18" height="12" rx="1" {...P} /><circle cx="12" cy="12" r="2.6" {...P} /></>,
  // სტატისტიკა
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...P} /></>,
  // ხალხი
  users: <><circle cx="9" cy="8" r="3.2" {...P} /><path d="M3 20a6 6 0 0 1 12 0" {...P} /><path d="M16 5.5a3.2 3.2 0 0 1 0 5M17 14.5a6 6 0 0 1 4 5.5" {...P} /></>,
  // გაფრთხილება
  alert: <><path d="M12 4 2.5 20h19z" {...P} /><path d="M12 10v4M12 17.2v.2" {...P} /></>,
  // რუკის ნიშნული
  pin: <><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" {...P} /><circle cx="12" cy="10" r="2.4" {...P} /></>,
  // კამერა
  camera: <><path d="M3 8h3l1.5-2h9L18 8h3v12H3z" {...P} /><circle cx="12" cy="13.5" r="3.4" {...P} /></>,
  // საქაღალდე
  folder: <><path d="M3 6h6l2 2h10v11H3z" {...P} /></>,
  // ჩატი
  chat: <><path d="M4 5h16v11H9l-5 4z" {...P} /></>,
  // ჩამოტვირთვა
  down: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" {...P} /><path d="M5 19h14" {...P} /></>,
  // ატვირთვა
  up: <><path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" {...P} /><path d="M5 19h14" {...P} /></>,
  // შემოწმებული
  check: <><path d="M4.5 12.5 10 18 20 6" {...P} /></>,
  // ჯვარი
  close: <><path d="M6 6l12 12M18 6 6 18" {...P} /></>,
  // საკეტი
  lock: <><rect x="5" y="10" width="14" height="10" rx="1.5" {...P} /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" {...P} /></>,
  // კომპასი
  compass: <><circle cx="12" cy="12" r="8.5" {...P} /><path d="m15 9-2 4-4 2 2-4z" {...P} /></>,
  // უკან
  back: <><path d="M14 6l-6 6 6 6" {...P} /></>,
};

export default function Icon({ name, size = 20, style }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {d}
    </svg>
  );
}
