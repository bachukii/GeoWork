import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Sheet, Stars, Spinner } from "./UI";

export default function SurveyorProfile({ surveyorId, onClose }) {
  const [p, setP] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: st }, { data: rv }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", surveyorId).maybeSingle(),
        supabase.from("surveyor_stats").select("*").eq("id", surveyorId).maybeSingle(),
        supabase.from("ratings").select("*").eq("to_id", surveyorId).order("created_at", { ascending: false }),
      ]);
      setP(prof); setStats(st); setReviews(rv || []);
    })();
  }, [surveyorId]);

  return (
    <Sheet title="ამზომველის პროფილი" onClose={onClose}>
      {!p ? <Spinner /> : (
        <>
          <div className="card tick" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 52, height: 52, background: "var(--black)", color: "var(--slab)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
                {p.full_name?.[0] || "?"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {p.full_name}{" "}
                  {p.verified && <span style={{ color: "var(--field)", fontSize: 13 }}>✓ Verified</span>}
                </div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {p.user_type === "company" ? "🏢 გეოდეზიური კომპანია" : "📐 გეოდეზისტი"}
                  {p.experience ? ` · ${p.experience} წელი` : ""}
                </div>
              </div>
            </div>
            <div className="grid3" style={{ marginTop: 10 }}>
              <div className="stat">
                <div className="n"><Stars v={stats?.avg_rating} /></div>
                <div className="t">{Number(stats?.avg_rating || 0).toFixed(1)} / 5</div>
              </div>
              <div className="stat">
                <div className="n mono">{stats?.completed_jobs ?? 0}</div>
                <div className="t">დასრულებული</div>
              </div>
              <div className="stat">
                <div className="n mono">{stats?.review_count ?? 0}</div>
                <div className="t">შეფასება</div>
              </div>
            </div>
          </div>

          {p.bio && <div className="card" style={{ marginBottom: 10, fontSize: 13.5 }}>{p.bio}</div>}

          <div className="lbl" style={{ marginBottom: 4 }}>მომსახურებები</div>
          <div className="wrap" style={{ marginBottom: 10 }}>
            {(p.services || []).map((s) => <span key={s} className="pill" style={{ color: "var(--black)" }}>{s}</span>)}
          </div>

          <div className="lbl" style={{ marginBottom: 4 }}>სამუშაო რეგიონები</div>
          <div className="wrap" style={{ marginBottom: 10 }}>
            {(p.regions || []).map((r) => <span key={r} className="pill s-selected">{r}</span>)}
          </div>

          {reviews.length > 0 && (
            <>
              <div className="lbl" style={{ marginBottom: 4 }}>შეფასებები</div>
              {reviews.map((r) => (
                <div key={r.id} className="card" style={{ marginBottom: 6, fontSize: 13 }}>
                  <Stars v={r.overall} /> {r.comment || ""}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
