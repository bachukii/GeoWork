import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Empty, Spinner } from "./UI";
import { dateOf } from "../lib/constants";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.zip";
const MAX_MB = 50;

const fileSize = (b) => {
  if (!b) return "";
  return b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const iconFor = (name = "") => {
  const e = name.split(".").pop()?.toLowerCase();
  if (e === "pdf") return "📄";
  if (["jpg", "jpeg", "png"].includes(e)) return "🖼";
  if (["dwg", "dxf"].includes(e)) return "📐";
  if (e === "zip") return "🗜";
  return "📎";
};

// ============ ამზომველის მხარე: ატვირთვა ============
export function DeliverablesUpload({ orderId, meId, toast }) {
  const [files, setFiles] = useState(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const inputRef = useRef();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("deliverables").select("*")
      .eq("order_id", orderId).order("created_at", { ascending: false });
    if (error) { toast("ფაილები ვერ ჩაიტვირთა"); return; }
    setFiles(data || []);
  }, [orderId, toast]);

  useEffect(() => { load(); }, [load]);

  const upload = async (file) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`ფაილი ${MAX_MB}MB-ზე დიდია`); return;
    }
    setBusy(true);
    const safe = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${orderId}/${crypto.randomUUID()}_${safe}`;

    const { error: upErr } = await supabase.storage
      .from("deliverables").upload(path, file, { upsert: false });

    if (upErr) {
      setBusy(false);
      toast("ატვირთვა ვერ მოხერხდა: " + upErr.message);
      return;
    }

    const version = (files?.length || 0) + 1;
    const { error: dbErr } = await supabase.from("deliverables").insert({
      order_id: orderId, uploader_id: meId, path,
      file_name: file.name, file_size: file.size, mime_type: file.type || null,
      version, label: label.trim() || `ვერსია ${version}`, released: false,
    });

    setBusy(false);
    if (dbErr) {
      await supabase.storage.from("deliverables").remove([path]);
      toast("ჩანაწერი ვერ შეიქმნა"); return;
    }
    setLabel("");
    toast("ფაილი აიტვირთა");
    load();
  };

  const release = async (f) => {
    const { error } = await supabase.from("deliverables")
      .update({ released: !f.released }).eq("id", f.id);
    if (error) { toast("ვერ შეიცვალა"); return; }
    toast(f.released ? "მიწოდება გაუქმდა" : "გაეგზავნა დამკვეთს");
    load();
  };

  const remove = async (f) => {
    await supabase.storage.from("deliverables").remove([f.path]);
    await supabase.from("deliverables").delete().eq("id", f.id);
    toast("წაიშალა"); load();
  };

  const open = async (f) => {
    const { data, error } = await supabase.storage
      .from("deliverables").createSignedUrl(f.path, 120);
    if (error) { toast("ფაილი ვერ გაიხსნა"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div>
      <div className="lbl">ნახაზის / დოკუმენტის ატვირთვა</div>
      <input className="inp" placeholder="დასახელება (მაგ: საბოლოო ნახაზი)"
        value={label} onChange={(e) => setLabel(e.target.value)} />
      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <button className="btn2" style={{ marginTop: 6 }} disabled={busy}
        onClick={() => inputRef.current.click()}>
        {busy ? "იტვირთება…" : "📤 ფაილის არჩევა"}
      </button>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
        PDF, JPG, PNG, DWG, DXF, ZIP · მაქს. {MAX_MB}MB
      </div>

      <div className="hl" />

      {files === null ? <Spinner /> : files.length === 0 ? (
        <Empty t="ფაილი ჯერ არ არის ატვირთული" />
      ) : (
        <div className="col">
          {files.map((f) => (
            <div key={f.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, wordBreak: "break-all" }}>
                    {iconFor(f.file_name)} {f.file_name}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {f.label} · {fileSize(f.file_size)} · {dateOf(f.created_at)}
                  </div>
                </div>
                <span className={`pill ${f.released ? "s-done" : "s-open"}`}>
                  {f.released ? "გაგზავნილი" : "არ არის გაგზავნილი"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button className="btn2 btn-sm" onClick={() => open(f)}>ნახვა</button>
                <button className="btn btn-sm" onClick={() => release(f)}
                  style={f.released ? { background: "var(--graphite)" } : {}}>
                  {f.released ? "მიწოდების გაუქმება" : "დამკვეთისთვის გაგზავნა"}
                </button>
                <button className="btn2 btn-sm btn-danger" onClick={() => remove(f)}>წაშლა</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="warn" style={{ marginTop: 10 }}>
        დამკვეთი ფაილს ნახავს მხოლოდ მაშინ, როცა გაგზავნილია <b>და</b> გადახდა
        დადასტურებულია. ეს სერვერზეა შემოწმებული — პირდაპირი ბმულითაც ვერ ჩამოტვირთავს.
      </div>
    </div>
  );
}

// ============ დამკვეთის მხარე: ჩამოტვირთვა ============
export function DeliverablesDownload({ orderId, isPaid, toast }) {
  const [files, setFiles] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("deliverables").select("*")
      .eq("order_id", orderId).eq("released", true)
      .order("version", { ascending: false });
    setFiles(data || []);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const open = async (f, download) => {
    const { data, error } = await supabase.storage
      .from("deliverables").createSignedUrl(f.path, 120, { download });
    if (error) { toast("ფაილი ვერ გაიხსნა — შეამოწმე გადახდის სტატუსი"); return; }
    window.open(data.signedUrl, "_blank");
  };

  if (!isPaid) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 20 }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>🔒</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>ფაილები დაბლოკილია</div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
          ნახაზები ხელმისაწვდომი გახდება გადახდის დადასტურების შემდეგ.
        </div>
      </div>
    );
  }

  if (files === null) return <Spinner />;
  if (files.length === 0) return <Empty t="ამზომველს ჯერ არაფერი გამოუგზავნია" />;

  return (
    <div className="col">
      {files.map((f) => (
        <div key={f.id} className="card tick">
          <div style={{ fontWeight: 600, fontSize: 13.5, wordBreak: "break-all" }}>
            {iconFor(f.file_name)} {f.file_name}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
            {f.label} · {fileSize(f.file_size)} · {dateOf(f.created_at)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn2 btn-sm" onClick={() => open(f, false)}>ნახვა</button>
            <button className="btn btn-sm" onClick={() => open(f, f.file_name)}>⬇ ჩამოტვირთვა</button>
          </div>
        </div>
      ))}
    </div>
  );
}
