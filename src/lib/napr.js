// ============================================================
// საჯარო რეესტრის საკადასტრო მონაცემები
//
// ორი გზა ნაკვეთის მოსანიშნად:
//   1. lookupByCode()  — საკადასტრო კოდით
//   2. identifyAt()    — რუკაზე დაჭერით
//
// ველების სახელები NAPR-ს არსად აქვს გამოქვეყნებული, ამიტომ
// აპი მათ თვითონ პოულობს: ჯერ ერთ ნიმუშს იღებს, ათვალიერებს
// თვისებებს და პოულობს იმას, რომლის მნიშვნელობაც საკადასტრო
// კოდის ფორმატს ემთხვევა. ერთხელ ნაპოვნი ინახება.
// ============================================================

const isDev = import.meta.env.DEV;
const GPV = isDev ? "http://gpv0.napr.gov.ge" : "/napr-wms";

const WFS = `${GPV}/geoserver/ParcelA/wfs`;
const WMS = `${GPV}/geoserver/ParcelA/wms`;
const LAYER = "ParcelA:RegParcels";

// საკადასტრო კოდი: XX.XX.XX.XXX ან XX.XX.XX.XXX.XXX
const CODE_RE = /^\d{2}\.\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/;
const CODE_LOOSE = /^\d{2}\.\d{2}\.\d{2}\.\d{3}/;

export const isValidCode = (c) => CODE_RE.test(String(c || "").trim());

// ---------- გეომეტრია ----------
function ringsFrom(geometry) {
  if (!geometry) return [];
  const { type, coordinates } = geometry;
  const flip = (ring) => ring.map(([lng, lat]) => [lat, lng]);
  if (type === "Polygon") return [flip(coordinates[0])];
  if (type === "MultiPolygon") return coordinates.map((poly) => flip(poly[0]));
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
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text.trim().startsWith("{")) return null;  // XML = შეცდომა
  try { return JSON.parse(text); } catch { return null; }
}

// ---------- ველის ავტომატური პოვნა ----------
let codeFieldCache = undefined;   // undefined = ჯერ არ გვიცდია, null = ვერ მოიძებნა

export async function discoverCodeField(signal) {
  if (codeFieldCache !== undefined) return codeFieldCache;

  const data = await getJson(`${WFS}?${new URLSearchParams({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: LAYER,
    outputFormat: "application/json", maxFeatures: "1", srsName: "EPSG:4326",
  })}`, signal);

  const props = data?.features?.[0]?.properties;
  if (!props) { codeFieldCache = null; return null; }

  // ველი, რომლის მნიშვნელობაც კოდის ფორმატისაა
  for (const [k, v] of Object.entries(props)) {
    if (CODE_LOOSE.test(String(v ?? ""))) { codeFieldCache = k; return k; }
  }
  // სათადარიგო: სახელით მიხვედრა
  const byName = Object.keys(props).find((k) => /cad|code|kod|parcel/i.test(k));
  codeFieldCache = byName || null;
  return codeFieldCache;
}

// ---------- 1. კოდით ძებნა ----------
export async function lookupByCode(rawCode, signal) {
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
  if (!parcel) return { ok: false, reason: "nogeom" };
  return { ok: true, parcel, field };
}

// ---------- 2. რუკაზე დაჭერით ----------
export async function identifyAt(map, latlng, signal) {
  const size = map.getSize();
  const b = map.getBounds();
  const pt = map.latLngToContainerPoint(latlng);

  const data = await getJson(`${WMS}?${new URLSearchParams({
    service: "WMS", version: "1.1.1", request: "GetFeatureInfo",
    layers: LAYER, query_layers: LAYER,
    info_format: "application/json", feature_count: "1", srs: "EPSG:4326",
    bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(","),
    width: String(size.x), height: String(size.y),
    x: String(Math.round(pt.x)), y: String(Math.round(pt.y)), buffer: "8",
  })}`, signal);

  if (!data) return { ok: false, reason: "service" };
  if (!data.features?.length) return { ok: false, reason: "notfound" };

  const parcel = parseFeature(data.features[0]);
  if (!parcel) return { ok: false, reason: "nogeom" };

  // დაჭერით მიღებული ნაკვეთიდანაც ვსწავლობთ ველის სახელს
  if (codeFieldCache == null) {
    for (const [k, v] of Object.entries(parcel.props)) {
      if (CODE_LOOSE.test(String(v ?? ""))) { codeFieldCache = k; break; }
    }
  }
  return { ok: true, parcel };
}

// თვისებებიდან კოდის ამოღება
export function codeFromProps(props = {}) {
  for (const v of Object.values(props)) {
    const s = String(v ?? "");
    if (CODE_LOOSE.test(s)) return s;
  }
  return null;
}

// შეცდომის ტექსტი ქართულად
export const reasonText = {
  empty:    "ჯერ ჩაწერე საკადასტრო კოდი.",
  format:   "კოდის ფორმატი არასწორია. მაგალითი: 01.72.14.031.045",
  notfound: "ამ კოდით ნაკვეთი რეესტრში ვერ მოიძებნა. შეამოწმე კოდი ან მონიშნე რუკაზე.",
  nogeom:   "ნაკვეთი მოიძებნა, მაგრამ საზღვრები არ დაბრუნდა.",
  nowfs:    "საჯარო რეესტრის სერვისს ვერ მივწვდი. მონიშნე ნაკვეთი რუკაზე დაჭერით.",
  service:  "სერვისი დროებით მიუწვდომელია.",
};
