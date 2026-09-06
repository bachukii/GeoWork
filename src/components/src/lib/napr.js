// ============================================================
// საჯარო რეესტრის საკადასტრო მონაცემები
//
// ორი გზა ნაკვეთის მოსანიშნად:
//   1. lookupByCode()  — საკადასტრო კოდით (WFS + CQL)
//   2. identifyAt()    — რუკაზე დაჭერით (WMS GetFeatureInfo)
//
// ⚠️ ველების ზუსტი სახელები NAPR-ს არსად აქვს გამოქვეყნებული,
// ამიტომ კოდით ძებნა რამდენიმე სავარაუდო ველს სცდის რიგრიგობით.
// თუ ვერცერთმა იმუშავა, identifyAt() დაგვიბრუნებს რეალურ ველებს
// და მაშინ CODE_FIELDS-ში სწორს ჩავამატებთ.
// ============================================================

const isDev = import.meta.env.DEV;
const GPV = isDev ? "http://gpv0.napr.gov.ge" : "/napr-wms";

const WFS = `${GPV}/geoserver/ParcelA/wfs`;
const WMS = `${GPV}/geoserver/ParcelA/wms`;
const LAYER = "ParcelA:RegParcels";

// სავარაუდო ველები საკადასტრო კოდისთვის
const CODE_FIELDS = [
  "cadastral_code", "cad_code", "code", "CADCODE",
  "cadastralcode", "parcel_code", "kod", "cad_no",
];

// ---------- GeoJSON → Leaflet-ის [[lat,lng],...] ----------
function ringsFrom(geometry) {
  if (!geometry) return [];
  const { type, coordinates } = geometry;
  const flip = (ring) => ring.map(([lng, lat]) => [lat, lng]);

  if (type === "Polygon") return [flip(coordinates[0])];
  if (type === "MultiPolygon") return coordinates.map((poly) => flip(poly[0]));
  return [];
}

function bboxOf(rings) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  rings.flat().forEach(([lat, lng]) => {
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
  });
  return [[minLat, minLng], [maxLat, maxLng]];
}

function parseFeature(f) {
  const rings = ringsFrom(f.geometry);
  if (!rings.length) return null;
  return {
    rings,
    outer: rings[0],
    bbox: bboxOf(rings),
    props: f.properties || {},
  };
}

// ---------- 1. კოდით ძებნა ----------
export async function lookupByCode(rawCode, signal) {
  const code = String(rawCode || "").trim();
  if (!code) return { ok: false, reason: "empty" };

  for (const field of CODE_FIELDS) {
    const url = `${WFS}?${new URLSearchParams({
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typeName: LAYER,
      outputFormat: "application/json",
      srsName: "EPSG:4326",
      maxFeatures: "5",
      cql_filter: `${field}='${code.replace(/'/g, "")}'`,
    })}`;

    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim().startsWith("{")) continue; // XML = შეცდომა
      const data = JSON.parse(text);
      if (!data.features?.length) continue;

      const parcel = parseFeature(data.features[0]);
      if (parcel) return { ok: true, parcel, field };
    } catch (e) {
      if (e.name === "AbortError") throw e;
    }
  }

  return { ok: false, reason: "notfound" };
}

// ---------- 2. რუკაზე დაჭერით ----------
export async function identifyAt(map, latlng, signal) {
  const size = map.getSize();
  const bounds = map.getBounds();
  const point = map.latLngToContainerPoint(latlng);

  const url = `${WMS}?${new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetFeatureInfo",
    layers: LAYER,
    query_layers: LAYER,
    info_format: "application/json",
    feature_count: "1",
    srs: "EPSG:4326",
    bbox: [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth(),
    ].join(","),
    width: String(size.x),
    height: String(size.y),
    x: String(Math.round(point.x)),
    y: String(Math.round(point.y)),
    buffer: "6",
  })}`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return { ok: false, reason: "http" };
    const text = await res.text();
    if (!text.trim().startsWith("{")) return { ok: false, reason: "format" };
    const data = JSON.parse(text);
    if (!data.features?.length) return { ok: false, reason: "notfound" };

    const parcel = parseFeature(data.features[0]);
    if (!parcel) return { ok: false, reason: "nogeom" };
    return { ok: true, parcel };
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return { ok: false, reason: "network" };
  }
}

// ნაკვეთის თვისებებიდან კოდის ამოღება — რომელი ველიც არ უნდა იყოს
export function codeFromProps(props = {}) {
  for (const k of Object.keys(props)) {
    const v = String(props[k] ?? "");
    if (/^\d{2}\.\d{2}\.\d{2}\.\d{3}/.test(v)) return v;
  }
  return null;
}
