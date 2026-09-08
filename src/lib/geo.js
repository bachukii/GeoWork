// გეოდეზიური გამოთვლები WGS84 კოორდინატებისთვის

const R = 6378137; // დედამიწის რადიუსი (მ)
const rad = (d) => (d * Math.PI) / 180;

// სფერული პოლიგონის ფართობი — [[lat,lng],...] → მ²
export function polygonArea(points) {
  if (!points || points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[(i + 1) % points.length];
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((total * R * R) / 2);
}

// მანძილი ორ წერტილს შორის (მ) — haversine
export function distance(a, b) {
  const [lat1, lng1] = a, [lat2, lng2] = b;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function centroid(points) {
  if (!points?.length) return null;
  const s = points.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [s[0] / points.length, s[1] / points.length];
}

export const fmtDistance = (m) =>
  m < 1000 ? `${Math.round(m)} მ` : `${(m / 1000).toFixed(1)} კმ`;

// ნავიგაციის ლინკი — მუშაობს Google Maps-შიც და Apple Maps-შიც
export const navUrl = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// ============================================================
// maps.gov.ge — საჯარო რეესტრის პორტალის ღრმა ბმული
//
// პორტალის iframe-ად ჩაშენება არ გამოგვადგება: ის მთლიანი
// აპლიკაციაა საკუთარი ინტერფეისით და X-Frame დაცვით.
// ამის ნაცვლად ვხსნით ზუსტ წერტილს იმავე ფენებით.
//
// layers=92,97,401 — ორთოფოტო + საკადასტრო ნაკვეთები + საზღვრები
// (ID-ები პორტალის შიდაა; შეცვლის შემთხვევაში აქ განახლდება)
// ============================================================
export const NAPR_PORTAL_LAYERS = "92,97,401";

export function naprPortalUrl(lat, lng, zoom = 18.5, layers = NAPR_PORTAL_LAYERS) {
  if (lat == null || lng == null) return null;
  const state = [
    `point=${lng},${lat}`,
    `zoom=${zoom}`,
    "projection=EPSG:4326",
    `layers=${layers}`,
    "lang=ka",
  ].join("&");
  return `https://maps.gov.ge/map/portal#state/${state}`;
}
