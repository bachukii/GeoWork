import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { timeOf } from "../lib/constants";

export default function Chat({ orderId, meId, place }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const boxRef = useRef();

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages").select("*").eq("order_id", orderId).order("created_at");
    if (error) { setErr("შეტყობინებები ვერ ჩაიტვირთა"); return; }
    setMsgs(data || []);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`msg:${orderId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${orderId}` },
        (p) => setMsgs((m) => m.some((x) => x.id === p.new.id) ? m : [...m, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs]);

  const send = async (body) => {
    const v = String(body || "").trim();
    if (!v) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ order_id: orderId, sender_id: meId, body: v });
    if (error) { setErr("გაგზავნა ვერ მოხერხდა"); return; }
    setErr("");
    load();
  };

  return (
    <div>
      {err && <div className="err">{err}</div>}
      <div ref={boxRef} style={{ maxHeight: 240, overflowY: "auto", padding: "6px 0", display: "flex", flexDirection: "column" }}>
        {msgs.length === 0 && (
          <div className="muted" style={{ fontSize: 12.5, textAlign: "center", padding: 12 }}>
            ჩატი ცარიელია — დაწერე პირველი შეტყობინება
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === meId ? "me" : "them"}`}>
            {m.body}
            <div style={{ fontSize: 10, opacity: .6, marginTop: 2 }}>{timeOf(m.created_at)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="inp" style={{ marginTop: 0 }} value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(text)} placeholder="შეტყობინება…" />
        <button className="btn btn-sm" onClick={() => send(text)} aria-label="გაგზავნა"><Icon name="check" size={16} /></button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button className="btn2 btn-sm" onClick={() => send(`ლოკაცია: ${place}`)}><Icon name="pin" size={14} /> ლოკაცია</button>
        <button className="btn2 btn-sm" onClick={() => send("ფოტო გაზიარებულია")}><Icon name="camera" size={14} /> ფოტო</button>
        <button className="btn2 btn-sm" onClick={() => send("დოკუმენტი გაზიარებულია")}><Icon name="folder" size={14} /> ფაილი</button>
      </div>
    </div>
  );
}
