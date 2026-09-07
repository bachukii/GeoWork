import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import Icon from "./Icon";

const BUCKET = "order-photos";
const MAX_MB = 8;
const MAX_COUNT = 10;
const ACCEPT = "image/*,.pdf";

// ---------- ხელმოწერილი ბმულების მიღება ----------
function useSignedUrls(paths) {
  const [urls, setUrls] = useState({});

  useEffect(() => {
    let alive = true;
    const list = (paths || []).filter((p) => p && p.includes("/"));
    if (!list.length) { setUrls({}); return; }

    (async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET).createSignedUrls(list, 3600);
      if (!alive || error || !data) return;
      const map = {};
      data.forEach((d) => { if (d.signedUrl) map[d.path] = d.signedUrl; });
      setUrls(map);
    })();

    return () => { alive = false; };
  }, [JSON.stringify(paths)]);

  return urls;
}

const isImage = (p = "") => /\.(jpe?g|png|webp|gif|heic)$/i.test(p);
const nameOf = (p = "") => p.split("/").pop().replace(/^[0-9a-f-]{36}_/i, "");

// ---------- ჩვენება ----------
export function PhotoGrid({ paths, cols = 4 }) {
  const urls = useSignedUrls(paths);
  const [zoom, setZoom] = useState(null);

  if (!paths?.length) return null;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 6 }}>
        {paths.map((p, i) => {
          const url = urls[p];
          const img = isImage(p);
          return (
            <button key={i} onClick={() => url && img && setZoom(url)}
              title={nameOf(p)}
              style={{
                aspectRatio: "1", padding: 0, overflow: "hidden",
                border: "1px solid var(--hair-2)", borderRadius: "var(--r)",
                background: "#EDEFEC", cursor: url && img ? "zoom-in" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {img ? (
                url
                  ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span className="muted" style={{ fontSize: 10 }}>…</span>
              ) : (
                <span className="mono muted" style={{ fontSize: 9, padding: 3, wordBreak: "break-all" }}>
                  {nameOf(p).slice(0, 22)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {zoom && (
        <div onClick={() => setZoom(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(19,58,94,.88)", zIndex: 90,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}>
          <img src={zoom} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <button onClick={() => setZoom(null)}
            style={{
              position: "absolute", top: 14, right: 14, background: "none",
              border: "none", color: "#fff", cursor: "pointer",
            }}>
            <Icon name="close" size={26} />
          </button>
        </div>
      )}
    </>
  );
}

// ---------- ატვირთვა ----------
export function PhotoUpload({ ownerId, folderId, value = [], onChange, toast }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef();
  const urls = useSignedUrls(value);

  const pick = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    if (value.length + arr.length > MAX_COUNT) {
      setErr(`მაქსიმუმ ${MAX_COUNT} ფაილი`); return;
    }
    setErr(""); setBusy(true);
    const added = [];

    for (const f of arr) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setErr(`„${f.name}" ${MAX_MB}MB-ზე დიდია`); continue;
      }
      const safe = f.name.replace(/[^\w.\-]/g, "_");
      const path = `${ownerId}/${folderId}/${crypto.randomUUID()}_${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, f);
      if (error) { setErr("ატვირთვა ვერ მოხერხდა: " + error.message); continue; }
      added.push(path);
    }

    setBusy(false);
    if (added.length) onChange([...value, ...added]);
  };

  const remove = async (path) => {
    await supabase.storage.from(BUCKET).remove([path]);
    onChange(value.filter((p) => p !== path));
  };

  return (
    <div>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} style={{ display: "none" }}
        onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />

      <button className="btn2" style={{ marginTop: 6 }} disabled={busy}
        onClick={() => inputRef.current.click()}>
        {busy ? "იტვირთება…" : "ფოტოს / ფაილის დამატება"}
      </button>

      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}

      {value.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 }}>
          {value.map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              <div style={{
                aspectRatio: "1", overflow: "hidden", background: "#EDEFEC",
                border: "1px solid var(--hair-2)", borderRadius: "var(--r)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isImage(p) && urls[p]
                  ? <img src={urls[p]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span className="mono muted" style={{ fontSize: 9, padding: 3, wordBreak: "break-all" }}>
                      {nameOf(p).slice(0, 20)}
                    </span>}
              </div>
              <button onClick={() => remove(p)} aria-label="წაშლა"
                style={{
                  position: "absolute", top: -7, right: -7, width: 22, height: 22,
                  borderRadius: "50%", border: "1px solid var(--hair-2)",
                  background: "#fff", color: "var(--bad)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}>
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="muted" style={{ fontSize: 11.5, marginTop: 7 }}>
        ტერიტორიის, შენობის, ოთახების ფოტოები ან არსებული დოკუმენტები.
        მაქს. {MAX_COUNT} ფაილი, თითო {MAX_MB}MB-მდე.
      </div>
    </div>
  );
}
