import L from "leaflet";

// ============================================================
// რუკის ფენები
//
// NAPR-ის სერვისები http-ია, საიტი https — ამიტომ ტაილები
// Netlify-ს proxy-ით მოდის (იხ. netlify.toml).
// ლოკალურ dev-ზე proxy არ არსებობს, ამიტომ იქ პირდაპირ http-ს ვიყენებთ.
// ============================================================

const isDev = import.meta.env.DEV;
const MP1 = isDev ? "http://mp1.napr.gov.ge" : "/napr-tiles";
const GPV = isDev ? "http://gpv0.napr.gov.ge" : "/napr-wms";

// WMTS-ის TileMatrix ორნიშნა ნულებიანია ("07", "18"),
// Leaflet კი {z}-ს ნულების გარეშე აწვდის — ამიტომ getTileUrl-ს ვცვლით.
const NaprWMTS = L.TileLayer.extend({
  getTileUrl(coords) {
    return L.Util.template(this._url, {
      ...this.options,
      z: String(coords.z).padStart(2, "0"),
      x: coords.x,
      y: coords.y,
      s: this._getSubdomain(coords),
    });
  },
});

const orthoLayer = (name) =>
  new NaprWMTS(`${MP1}/${name}/wmts/${name}/GLOBAL_MERCATOR/{z}/{x}/{y}.png`, {
    maxZoom: 20, maxNativeZoom: 20, minZoom: 8,
    attribution: "ორთოფოტო: საჯარო რეესტრი",
  });

// Google-ის რუკა — მხოლოდ გასაღებით.
// mt.google.com-ის "უფასო" ტაილები Google-ის პირობებს არღვევს,
// ამიტომ არ გამოგვიყენებია. ოფიციალური გზა API გასაღებს და
// ბილინგის ჩართვას მოითხოვს.
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
  ortho: {
    label: "ორთოფოტო",
    // დაფარვა ნაწილობრივია — 2014 წ. დასავლეთ საქართველო.
    // სხვა რეგიონებზე ცარიელი გამოვა; ამიტომ ქვეშ სატელიტი დევს.
    make: () => orthoLayer("ORTHO_2014_DASAVLETI"),
    partial: true,
    under: "sat",
  },
};

// საკადასტრო ნაკვეთები — ზედა ფენა, გამჭვირვალე
export function cadastreOverlay() {
  return L.tileLayer.wms(`${GPV}/geoserver/ParcelA/wms`, {
    layers: "ParcelA:RegParcels",
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    maxZoom: 20,
    opacity: 0.85,
    attribution: "საკადასტრო მონაცემები: საჯარო რეესტრი",
  });
}
