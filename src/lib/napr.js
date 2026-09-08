// ============================================================
// საჯარო რეესტრის მონაცემები
//
// მდგომარეობა 2026 წლის სექტემბრისთვის:
//
//   ღიაა    — ორთოფოტოს WMTS (mp1.napr.gov.ge)
//   დახურულია — საკადასტრო ვექტორი (gpv0/nv.napr.gov.ge GeoServer)
//               პასუხობს "Access Denied" / "Restricted to authorized users"
//
// ამიტომ კოდით ძებნა ნაგულისხმევად გამორთულია. თუ NAPR-თან
// ოფიციალური წვდომა გაქვს, ჩართე .env-ში:
//
//   VITE_NAPR_WFS=https://შენი-endpoint/geoserver/workspace/wfs
//   VITE_NAPR_LAYER=workspace:LayerName
//
// ველების სახელებს აპი თვითონ პოულობს — ხელით მითითება არ სჭირდება.
// ============================================================

const WFS = import.meta.env.VITE_NAPR_WFS || null;
const LAYER = import.meta.env.VITE_NAPR_LAYER || null;

export const cadastreEnabled = Boolean(WFS && LAYER);

const CODE_RE = /^\d{2}\.\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/;
const CODE_LOOSE = /^\d{2}\.\d{2}\.\d{2}\.\d{3}/;

export const isValidCode = (c) => CODE_RE.test(String(c || "").trim());

// ---------- გეომეტრია ----------
function ringsFrom(g) {
  if (!g) return [];
  const flip = (r) => r.map(([lng, lat]) => [lat, lng]);
  if (g.type === "Polygon") return [flip(g.coordinates[0])];
  if (g.type === "MultiPolygon") return g.coordinates.map((p) => flip(p[0]));
  return [];
}

function bboxOf(rings) {
  let a = 90, b = -90, c = 180, d = -180;
  rings.flat().forEach(([lat, lng]) => {
    if (lat < a) a = lat; if (lat > b) b = lat;
    if (lng < c) c = lng; if (lng > d) d = lng;
  });
  return [[a, c], [b, d]];
}

function parseFeature(f) {
  const rings = ringsFrom(f.geometry);
  if (!rings.length) return null;
  return { rings, outer: rings[0], bbox: bboxOf(rings), props: f.properties || {} };
}

async function getJson(url, signal) {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim().startsWith("{")) return null;
    return JSON.parse(text);
  } catch { return null; }
}

// ---------- ველის ავტომატური პოვნა ----------
let codeField = undefined;

async function discoverCodeField(signal) {
  if (codeField !== undefined) return codeField;
  const data = await getJson(`${WFS}?${new URLSearchParams({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: LAYER,
    outputFormat: "application/json", maxFeatures: "1", srsName: "EPSG:4326",
  })}`, signal);

  const props = data?.features?.[0]?.properties;
  if (!props) { codeField = null; return null; }

  for (const [k, v] of Object.entries(props)) {
    if (CODE_LOOSE.test(String(v ?? ""))) { codeField = k; return k; }
  }
  codeField = Object.keys(props).find((k) => /cad|code|kod|parcel/i.test(k)) || null;
  return codeField;
}

// ---------- კოდით ძებნა ----------
export async function lookupByCode(rawCode, signal) {
  if (!cadastreEnabled) return { ok: false, reason: "disabled" };

  const code = String(rawCode || "").trim();
  if (!code) return { ok: false, reason: "empty" };
  if (!CODE_LOOSE.test(code)) return { ok: false, reason: "format" };

  const field = await discoverCodeField(signal);
  if (!field) return { ok: false, reason: "nowfs" };

  const data = await getJson(`${WFS}?${new URLSearchParams({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: LAYER,
    outputFormat: "application/json", srsName: "EPSG:4326", maxFeatures: "5",
    cql_filter: `${field}='${code.replace(/'/g, "")}'`,
  })}`, signal);

  if (!data) return { ok: false, reason: "nowfs" };
  if (!data.features?.length) return { ok: false, reason: "notfound" };

  const parcel = parseFeature(data.features[0]);
  return parcel ? { ok: true, parcel, field } : { ok: false, reason: "nogeom" };
}

export function codeFromProps(props = {}) {
  for (const v of Object.values(props)) {
    const s = String(v ?? "");
    if (CODE_LOOSE.test(s)) return s;
  }
  return null;
}

export const reasonText = {
  disabled: "საკადასტრო ბაზასთან პირდაპირი წვდომა არ არის ჩართული. მონიშნე ნაკვეთი რუკაზე ან გახსენი maps.gov.ge და იქიდან გადმოიტანე.",
  empty:    "ჯერ ჩაწერე საკადასტრო კოდი.",
  format:   "კოდის ფორმატი არასწორია. მაგალითი: 01.72.14.031.045",
  notfound: "ამ კოდით ნაკვეთი ვერ მოიძებნა.",
  nogeom:   "ნაკვეთი მოიძებნა, მაგრამ საზღვრები არ დაბრუნდა.",
  nowfs:    "საკადასტრო სერვისს ვერ მივწვდი.",
};
