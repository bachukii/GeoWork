// ============================================================
// საკადასტრო ნაკვეთის ძებნა კოდით
//
// NAPR-ის სერვისი ბოტებს ბლოკავს, ნამდვილი ბრაუზერიდან კი
// შესაძლოა მუშაობდეს. ამიტომ რამდენიმე გზას ვცდით რიგრიგობით
// და ვაჩვენებთ, რომელმა იმუშავა.
//
// გზები:
//   1. პირდაპირ https-ით ბრაუზერიდან  — CORS-ზეა დამოკიდებული
//   2. Netlify-ს proxy-ით             — WAF-მა შეიძლება დაბლოკოს
//   3. WMS GetFeatureInfo             — სათადარიგო
//
// თუ საკუთარი endpoint გაქვს, .env-ში:
//   VITE_NAPR_WFS / VITE_NAPR_WMS / VITE_NAPR_LAYER
// ============================================================

const CUSTOM_WFS   = import.meta.env.VITE_NAPR_WFS || null;
const CUSTOM_WMS   = import.meta.env.VITE_NAPR_WMS || null;
const CUSTOM_LAYER = import.meta.env.VITE_NAPR_LAYER || null;

const DEFAULT_LAYER = "ParcelA:RegParcels";
export const LAYER = CUSTOM_LAYER || DEFAULT_LAYER;

// ცდის რიგი — პირველი წარმატებული იმახსოვრება
const WFS_ENDPOINTS = [
  CUSTOM_WFS,
  "https://gpv0.napr.gov.ge/geoserver/ParcelA/wfs",
  "/napr-wms/geoserver/ParcelA/wfs",
].filter(Boolean);

const WMS_ENDPOINTS = [
  CUSTOM_WMS,
  "https://gpv0.napr.gov.ge/geoserver/ParcelA/wms",
  "/napr-wms/geoserver/ParcelA/wms",
].filter(Boolean);

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

// ---------- ერთი მოთხოვნა ----------
async function tryJson(url, signal) {
  try {
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, why: `http ${res.status}` };
    const text = await res.text();
    const head = text.trim().slice(0, 1);
    if (head !== "{") return { ok: false, why: "არა-JSON პასუხი (დაბლოკილია)" };
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return { ok: false, why: "ქსელი/CORS" };
  }
}

// ---------- ველის პოვნა ----------
let goodEndpoint = null;
let codeField = null;

function q(params) { return new URLSearchParams(params).toString(); }

async function findField(endpoint, signal) {
  const r = await tryJson(`${endpoint}?${q({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: LAYER,
    outputFormat: "application/json", maxFeatures: "1", srsName: "EPSG:4326",
  })}`, signal);
  if (!r.ok) return { ok: false, why: r.why };

  const props = r.data?.features?.[0]?.properties;
  if (!props) return { ok: false, why: "ცარიელი პასუხი" };

  for (const [k, v] of Object.entries(props)) {
    if (CODE_LOOSE.test(String(v ?? ""))) return { ok: true, field: k };
  }
  const guess = Object.keys(props).find((k) => /cad|code|kod|parcel/i.test(k));
  return guess ? { ok: true, field: guess } : { ok: false, why: "კოდის ველი ვერ ვიპოვე" };
}

// ---------- მთავარი: ძებნა კოდით ----------
export async function lookupByCode(rawCode, signal) {
  const code = String(rawCode || "").trim();
  if (!code) return { ok: false, reason: "empty" };
  if (!CODE_LOOSE.test(code)) return { ok: false, reason: "format" };

  const tried = [];

  // 1-2. WFS ყველა endpoint-ზე
  const order = goodEndpoint
    ? [goodEndpoint, ...WFS_ENDPOINTS.filter((e) => e !== goodEndpoint)]
    : WFS_ENDPOINTS;

  for (const ep of order) {
    let field = codeField;
    if (!field || goodEndpoint !== ep) {
      const f = await findField(ep, signal);
      if (!f.ok) { tried.push(`${ep} — ${f.why}`); continue; }
      field = f.field;
    }

    const r = await tryJson(`${ep}?${q({
      service: "WFS", version: "1.1.0", request: "GetFeature", typeName: LAYER,
      outputFormat: "application/json", srsName: "EPSG:4326", maxFeatures: "5",
      cql_filter: `${field}='${code.replace(/'/g, "")}'`,
    })}`, signal);

    if (!r.ok) { tried.push(`${ep} — ${r.why}`); continue; }

    goodEndpoint = ep; codeField = field;

    if (!r.data.features?.length) return { ok: false, reason: "notfound", tried };
    const parcel = parseFeature(r.data.features[0]);
    if (parcel) return { ok: true, parcel, via: ep, field };
    tried.push(`${ep} — გეომეტრია ცარიელია`);
  }

  return { ok: false, reason: "blocked", tried };
}

// ---------- რუკაზე დაჭერით ----------
export async function identifyAt(map, latlng, signal) {
  const size = map.getSize();
  const b = map.getBounds();
  const pt = map.latLngToContainerPoint(latlng);
  const params = {
    service: "WMS", version: "1.1.1", request: "GetFeatureInfo",
    layers: LAYER, query_layers: LAYER,
    info_format: "application/json", feature_count: "1", srs: "EPSG:4326",
    bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(","),
    width: String(size.x), height: String(size.y),
    x: String(Math.round(pt.x)), y: String(Math.round(pt.y)), buffer: "8",
  };

  for (const ep of WMS_ENDPOINTS) {
    const r = await tryJson(`${ep}?${q(params)}`, signal);
    if (!r.ok) continue;
    if (!r.data.features?.length) return { ok: false, reason: "notfound" };
    const parcel = parseFeature(r.data.features[0]);
    if (parcel) return { ok: true, parcel, via: ep };
  }
  return { ok: false, reason: "blocked" };
}

export function codeFromProps(props = {}) {
  for (const v of Object.values(props)) {
    const s = String(v ?? "");
    if (CODE_LOOSE.test(s)) return s;
  }
  return null;
}

export const reasonText = {
  empty:    "ჯერ ჩაწერე საკადასტრო კოდი.",
  format:   "ფორმატი არასწორია. მაგალითი: 01.72.14.031.045",
  notfound: "ამ კოდით ნაკვეთი ვერ მოიძებნა. შეამოწმე კოდი.",
  blocked:  "საჯარო რეესტრის სერვისმა მოთხოვნა არ მიიღო. გახსენი maps.gov.ge, იპოვე ნაკვეთი კოდით და კონტური აქ ხელით მონიშნე.",
};
