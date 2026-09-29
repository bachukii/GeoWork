import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { polygonArea, centroid, naprPortalUrl } from "../lib/geo";
import { BASEMAPS, cadastreOverlay, cadastreAvailable } from "../lib/basemaps";
import LayerSwitch from "./LayerSwitch";
import { m2 } from "../lib/constants";

const NAPR_PORTAL = "https://maps.gov.ge/map/portal/";

// ნაგულისხმევი ცენტრი — თბილისი
const DEFAULT_CENTER = [41.7151, 44.8271];

// Leaflet-ის ნაგულისხმევი მარკერის ხატულები bundler-ში იტეხება,
// ამიტომ ვიყენებთ CSS-ზე დაფუძნებულ divIcon-ს.
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;
    background:#E4FF1A;border:2px solid #0F1113;transform:rotate(-45deg);
    box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

const vertexIcon = L.divIcon({
  className: "",
  html: `<div style="width:11px;height:11px;border-radius:50%;
    background:#E4FF1A;border:2px solid #0F1113"></div>`,
  iconSize: [11, 11],
  iconAnchor: [5.5, 5.5],
});

export default function MapPicker({
  value,                 // { lat, lng, polygon }
  onChange,
  height = 300,
  readOnly = false,
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const polyRef = useRef(null);
  const vertexLayerRef = useRef(null);

  // საჯარო რეესტრის მონაცემთა სერვისი (gpv0.napr.gov.ge) დახურულია —
  // ნაკვეთს ავტომატურად ვეღარ ვიღებთ. დამკვეთი ნიშნავს წერტილს ან ხაზავს კონტურს.
  const [mode, setMode] = useState(value?.polygon?.length ? "polygon" : "point"); // point | polygon
  const [base, setBase] = useState("sat");
  const [cadastre, setCadastre] = useState(false);
  const baseRef = useRef(null);
  const underRef = useRef(null);
  const cadRef = useRef(null);
  const [pts, setPts] = useState(value?.polygon || []);
  const [center, setCenter] = useState(
    value?.lat ? [value.lat, value.lng] : null
  );
  const [locating, setLocating] = useState(false);

  const area = polygonArea(pts);

  // ---------- რუკის ინიციალიზაცია ----------
  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;

    const start = center || (value?.polygon?.length ? centroid(value.polygon) : DEFAULT_CENTER);
    const map = L.map(boxRef.current, {
      center: start,
      zoom: center || value?.polygon?.length ? 17 : 12,
      zoomControl: true,
      attributionControl: true,
    });

    vertexLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // ზომის გასწორება sheet-ში გახსნისას
    setTimeout(() => map.invalidateSize(), 100);

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- საბაზისო ფენა ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cfg = BASEMAPS[base];

    if (underRef.current) { map.removeLayer(underRef.current); underRef.current = null; }
    if (baseRef.current)  { map.removeLayer(baseRef.current);  baseRef.current = null; }

    // ნაწილობრივი დაფარვის ფენას ქვეშ სარეზერვო ედება
    if (cfg.under) {
      underRef.current = BASEMAPS[cfg.under].make().addTo(map);
      underRef.current.setZIndex(1);
    }
    baseRef.current = cfg.make().addTo(map);
    baseRef.current.setZIndex(2);
  }, [base]);

  // ---------- საკადასტრო ფენა ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (cadRef.current) { map.removeLayer(cadRef.current); cadRef.current = null; }
    if (cadastre) {
      const ov = cadastreOverlay();
      if (ov) { cadRef.current = ov.addTo(map); cadRef.current.setZIndex(3); }
    }
  }, [cadastre]);

  // ---------- დაჭერის დამუშავება ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || readOnly) return;

    const onClick = (e) => {
      const p = [e.latlng.lat, e.latlng.lng];
      if (mode === "point") {
        setCenter(p);
        setPts([]);
      } else {
        setPts((prev) => [...prev, p]);
      }
    };
    map.on("click", onClick);
    return () => map.off("click", onClick);
  }, [mode, readOnly]);

  // ---------- მარკერის დახატვა ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; }
    if (center && mode === "point") {
      markerRef.current = L.marker(center, { icon: pinIcon }).addTo(map);
    }
  }, [center, mode]);

  // ---------- პოლიგონის დახატვა ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (polyRef.current) { map.removeLayer(polyRef.current); polyRef.current = null; }
    vertexLayerRef.current?.clearLayers();

    if (pts.length >= 2) {
      polyRef.current = L.polygon(pts, {
        color: "#0F1113", weight: 3, fillColor: "#E4FF1A", fillOpacity: 0.30,
      }).addTo(map);
    }
    if (!readOnly) {
      pts.forEach((p) => L.marker(p, { icon: vertexIcon }).addTo(vertexLayerRef.current));
    }
  }, [pts, readOnly]);

  // ---------- ცვლილების ამოტანა ზემოთ ----------
  const emit = useCallback(() => {
    const c = pts.length >= 3 ? centroid(pts) : center;
    onChange?.({
      lat: c?.[0] ?? null,
      lng: c?.[1] ?? null,
      polygon: pts.length >= 3 ? pts : null,
      area: pts.length >= 3 ? Math.round(polygonArea(pts)) : null,
    });
  }, [pts, center, onChange]);

  useEffect(() => { emit(); }, [emit]);

  // ---------- ჩემი ადგილმდებარეობა ----------
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        mapRef.current?.setView(p, 17);
        if (mode === "point") setCenter(p);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div>
      {!readOnly && (
        <>
          <div className="grid2" style={{ marginBottom: 8 }}>
            <button className={`chip ${mode === "point" ? "on" : ""}`}
              onClick={() => setMode("point")}>წერტილის დასმა</button>
            <button className={`chip ${mode === "polygon" ? "on" : ""}`}
              onClick={() => { setMode("polygon"); setCenter(null); }}>კონტურის დახაზვა</button>
          </div>
          <LayerSwitch base={base} setBase={setBase} cadastre={cadastre} setCadastre={setCadastre} />
        </>
      )}

      <div ref={boxRef} style={{ height, zIndex: 1 }} />

      {BASEMAPS[base].partial && (
        <div className="warn" style={{ marginTop: 6 }}>
          ორთოფოტოს დაფარვა ნაწილობრივია (2014, დასავლეთ საქართველო).
          სხვა რეგიონში ქვედა ფენა ჩანს.
        </div>
      )}

      {!readOnly && (
        <>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <button className="btn2 btn-sm" onClick={locate} disabled={locating}>
              {locating ? "…" : "ჩემი ადგილი"}
            </button>
            {(() => {
              const c = pts.length >= 3 ? centroid(pts) : center;
              return (
                <a className="btn2 btn-sm" href={c ? naprPortalUrl(c[0], c[1]) : NAPR_PORTAL}
                  target="_blank" rel="noreferrer"
                  style={{ textDecoration: "none", display: "inline-block" }}>
                  საჯარო რეესტრის რუკა ↗
                </a>
              );
            })()}
            {mode === "polygon" && (
              <>
                <button className="btn2 btn-sm" onClick={() => setPts((p) => p.slice(0, -1))}
                  disabled={!pts.length}>ბოლო წერტილი</button>
                <button className="btn2 btn-sm" onClick={() => setPts([])}
                  disabled={!pts.length}>გასუფთავება</button>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 8, fontSize: 12.5 }}>
            {mode === "point" ? (
              center
                ? <>მონიშნულია: <span className="mono">{center[0].toFixed(5)}, {center[1].toFixed(5)}</span></>
                : <span className="muted">დააჭირე რუკაზე ობიექტის ადგილის მოსანიშნად</span>
            ) : (
              pts.length >= 3
                ? <>{pts.length} წერტილი · <b className="mono">≈ {m2(Math.round(area))}</b></>
                : <span className="muted">დააჭირე რუკაზე ნაკვეთის კუთხეების მოსანიშნად (მინ. 3)</span>
            )}
          </div>

          {mode === "polygon" && pts.length >= 3 && (
            <div className="warn" style={{ marginTop: 6 }}>
              ხელით მონიშნული ტერიტორია მიახლოებითია — საბოლოო ფართობს სპეციალისტი განსაზღვრავს.
            </div>
          )}
        </>
      )}
    </div>
  );
}
