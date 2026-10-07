import L from "leaflet";

// რუკის ფენები: OpenStreetMap, Esri-ის სატელიტი, საჯარო რეესტრის ორთოფოტო
// და საკადასტრო ფენა (nv.napr.gov.ge / mp.napr.gov.ge — იგივე, რასაც „საველე აზომვა" იყენებს).
// WMS-ის სურათებს ბრაუზერი პირდაპირ ტვირთავს — CORS მათზე არ მოქმედებს, proxy არ სჭირდება.

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export const BASEMAPS = {
  osm: {
    label: "რუკა",
    make: () => L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap",
    }),
  },
  sat: {
    label: "სატელიტი",
    make: () => L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Esri" }
    ),
  },
  ortho: {
    label: "ორთოფოტო",
    make: () => L.tileLayer.wms("https://mp.napr.gov.ge/WBR/service", {
      layers: "WBR", format: "image/jpeg", transparent: false, version: "1.3.0",
      maxZoom: 20, attribution: "ორთოფოტო: საჯარო რეესტრი",
    }),
    under: "sat",
  },
  ...(GOOGLE_KEY ? {
    google: {
      label: "Google",
      make: () => L.tileLayer(
        `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session={session}&key=${GOOGLE_KEY}`,
        { maxZoom: 20, attribution: "Google" }
      ),
    },
  } : {}),
};

// საკადასტრო ფენა — ნაკვეთები და შენობები
export const cadastreWmsUrl = import.meta.env.VITE_NAPR_WMS || "https://nv.napr.gov.ge/geoserver/wms";
export const cadastreLayer  = import.meta.env.VITE_NAPR_LAYER || "NG_REG_LAYER";
export const cadastreAvailable = Boolean(cadastreWmsUrl && cadastreLayer);

export function cadastreOverlay() {
  if (!cadastreAvailable) return null;
  return L.tileLayer.wms(cadastreWmsUrl, {
    layers: cadastreLayer,
    format: "image/png",
    transparent: true,
    version: "1.3.0",
    maxZoom: 20,
    minZoom: 14,
    opacity: 0.95,
    attribution: "საკადასტრო მონაცემები: საჯარო რეესტრი",
  });
}
