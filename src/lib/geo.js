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

// ---------- UTM 38N (EPSG:32638) → WGS84 ----------
// საჯარო რეესტრის WFS ნაკვეთებს UTM 38N-ში აბრუნებს.
export function utm38ToLatLng(E, N) {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const x = E - 500000, M = N / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const s = Math.sin(p), c = Math.cos(p), t = Math.tan(p);
  const N1 = a / Math.sqrt(1 - e2 * s * s);
  const T1 = t * t, C1 = ep2 * c * c;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * s * s, 1.5);
  const D = x / (N1 * k0);
  const lat = p - (N1 * t / R1) * (D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lng = (D - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / c;
  return [lat * 180 / Math.PI, 45 + lng * 180 / Math.PI];
}
