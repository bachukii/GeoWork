import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { distance, fmtDistance, navUrl, naprPortalUrl } from "../lib/geo";
import { BASEMAPS, cadastreOverlay, cadastreAvailable } from "../lib/basemaps";
import LayerSwitch from "./LayerSwitch";

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;
    background:#E4FF1A;border:2px solid #0F1113;transform:rotate(-45deg);
    box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 18],
});
const meIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#FF5C1A;
    border:3px solid #fff;box-shadow:0 0 0 2px #0F1113"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

// მხოლოდ საჩვენებელი რუკა — ამზომველი ხედავს სად არის სამუშაო
export default function MapView({ lat, lng, polygon, height = 240, label }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const [dist, setDist] = useState(null);
  const [base, setBase] = useState("sat");
  const [cadastre, setCadastre] = useState(cadastreAvailable);
  const baseRef = useRef(null);
  const underRef = useRef(null);
  const cadRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;
    if (!lat && !polygon?.length) return;

    const center = lat ? [lat, lng] : polygon[0];
    const map = L.map(boxRef.current, { center, zoom: 16 });
    if (polygon?.length >= 3) {
      const poly = L.polygon(polygon, {
        color: "#0F1113", weight: 3, fillColor: "#E4FF1A", fillOpacity: 0.30,
      }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [24, 24] });
    }
    if (lat) L.marker([lat, lng], { icon: pinIcon }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    // მანძილი ამზომველიდან
    if (lat && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const me = [pos.coords.latitude, pos.coords.longitude];
          L.marker(me, { icon: meIcon }).addTo(map);
          setDist(distance(me, [lat, lng]));
        },
        () => {},
        { timeout: 6000 }
      );
    }

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // საბაზისო ფენა
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cfg = BASEMAPS[base];
    if (underRef.current) { map.removeLayer(underRef.current); underRef.current = null; }
    if (baseRef.current)  { map.removeLayer(baseRef.current);  baseRef.current = null; }
    if (cfg.under) {
      underRef.current = BASEMAPS[cfg.under].make().addTo(map);
      underRef.current.setZIndex(1);
    }
    baseRef.current = cfg.make().addTo(map);
    baseRef.current.setZIndex(2);
  }, [base]);

  // საკადასტრო ფენა
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (cadRef.current) { map.removeLayer(cadRef.current); cadRef.current = null; }
    if (cadastre) {
      const ov = cadastreOverlay();
      if (ov) { cadRef.current = ov.addTo(map); cadRef.current.setZIndex(3); }
    }
  }, [cadastre]);

  if (!lat && !polygon?.length) {
    return <div className="card muted" style={{ fontSize: 12.5, textAlign: "center" }}>
      რუკაზე ადგილი მითითებული არ არის
    </div>;
  }

  return (
    <div>
      <LayerSwitch base={base} setBase={setBase} cadastre={cadastre} setCadastre={setCadastre} />
      <div ref={boxRef} style={{ height, zIndex: 1 }} />
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        {lat && (
          <a className="btn2 btn-sm" href={navUrl(lat, lng)} target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", display: "inline-block" }}>ნავიგაცია</a>
        )}
        {lat && (
          <a className="btn2 btn-sm" href={naprPortalUrl(lat, lng)} target="_blank" rel="noreferrer"
            style={{ textDecoration: "none", display: "inline-block" }}>
            maps.gov.ge
          </a>
        )}
        {dist !== null && (
          <span className="pill s-selected">{fmtDistance(dist)}</span>
        )}
        {label && <span className="muted" style={{ fontSize: 12 }}>{label}</span>}
      </div>
    </div>
  );
}
