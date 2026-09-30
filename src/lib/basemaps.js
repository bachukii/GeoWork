import L from "leaflet";

// რუკის ფენები: OpenStreetMap და Esri-ის სატელიტი.
// საჯარო რეესტრის ფენები (ორთოფოტო, ნაკვეთები) ამოღებულია — NAPR-ის სერვერები დახურულია.

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

// საკადასტრო ნაკვეთების ფენა.
// NAPR-ის GeoServer დახურულია ("Access Denied"), ამიტომ ჩაირთვება
// მხოლოდ მაშინ, როცა .env-ში საკუთარ endpoint-ს მიუთითებ.
// საჯარო რეესტრის WMS (gpv0.napr.gov.ge) საჯაროდ დახურულია („Access Denied"),
// ამიტომ ფენა ჩაირთვება მხოლოდ მაშინ, თუ .env-ში სხვა მისამართია მითითებული.
export const cadastreWmsUrl = import.meta.env.VITE_NAPR_WMS || null;
export const cadastreLayer  = import.meta.env.VITE_NAPR_LAYER || "ParcelA:RegParcels";
export const cadastreAvailable = Boolean(cadastreWmsUrl && cadastreLayer);

export function cadastreOverlay() {
  if (!cadastreAvailable) return null;
  return L.tileLayer.wms(cadastreWmsUrl, {
    layers: cadastreLayer,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    maxZoom: 20,
    opacity: 0.85,
    attribution: "საკადასტრო მონაცემები: საჯარო რეესტრი",
  });
}
