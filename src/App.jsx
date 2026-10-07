import React, { useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthScreen from "./views/AuthScreen";
import ClientView from "./views/ClientView";
import SurveyorView from "./views/SurveyorView";
import AdminView from "./views/AdminView";
import { Spinner } from "./components/UI";
import Logo from "./components/Logo";
import TriGrid from "./components/TriGrid";

export const APP_VERSION = "v16";

function Shell() {
  const { session, profile, loading, configured, signOut } = useAuth();
  const [toastMsg, setToastMsg] = useState("");
  const toast = useCallback((m) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(""), 2400);
  }, []);

  if (!configured) {
    return (
      <div className="app app-solo">
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>GeoBid</div>
          <div className="err">Supabase არ არის დაკონფიგურირებული.</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            შექმენი <code>.env</code> ფაილი პროექტის ძირში და ჩაწერე:
            <pre className="card mono" style={{ fontSize: 11.5, overflowX: "auto", marginTop: 8 }}>
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...`}
            </pre>
            დეტალები README.md-ში.
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="app app-solo"><Spinner /></div>;

  if (!session) return <AuthScreen />;

  // ავტორიზებულია, მაგრამ პროფილი არ არსებობს
  // (ძველი ანგარიში, შექმნილი migration_v5-მდე, ან migration_v5 არ არის გაშვებული)
  if (!profile) {
    return (
      <div className="app app-solo">
        <div style={{ padding: 24 }}>
          <div className="warn" style={{ marginBottom: 12 }}>
            ანგარიში არსებობს, მაგრამ პროფილი ვერ მოიძებნა.
          </div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            ადმინისტრატორისთვის: დარწმუნდი, რომ Supabase-ში გაშვებულია
            <span className="mono"> supabase/migration_v5.sql</span>. თუ ანგარიში ამ
            მიგრაციამდე შეიქმნა, წაშალე (Authentication → Users) და თავიდან დარეგისტრირდი.
          </div>
          <button className="btn2" onClick={signOut}>გასვლა</button>
        </div>
      </div>
    );
  }

  const roleLabel =
    profile.role === "client" ? "დამკვეთის კაბინეტი" :
    profile.role === "surveyor" ? "ამზომველის კაბინეტი" : "ადმინისტრირება";

  return (
    <div className="app">
      {toastMsg && <div className="toast">{toastMsg}</div>}
      <header className="hdr apphdr">
        <a href="/" className="apphdr-logo" aria-label="საიტზე დაბრუნება"><Logo size={21} /></a>
        <span className="apphdr-role">{roleLabel}</span>
        <div className="apphdr-user">
          <span className="apphdr-av" aria-hidden="true">{initials(profile.full_name)}</span>
          <span className="apphdr-name">{profile.full_name}</span>
          <button className="apphdr-out" onClick={signOut}>გასვლა</button>
        </div>
      </header>
      <section className="apphero">
        <TriGrid />
        <div className="apphero-in">
          <div className="apphero-kicker">{roleLabel}</div>
          <h1>გამარჯობა, {firstName(profile.full_name)}</h1>
          <p>{HERO_TEXT[profile.role] || ""}</p>
        </div>
      </section>
      <div className="grid-band" />

      {profile.role === "client" && <ClientView toast={toast} />}
      {profile.role === "surveyor" && <SurveyorView toast={toast} />}
      {profile.role === "admin" && <AdminView toast={toast} />}
    </div>
  );
}

const firstName = (name = "") => name.trim().split(/\s+/)[0] || "";

const HERO_TEXT = {
  client: "აქ განათავსებ შეკვეთებს, ადარებ ამზომველების ფასებს და იღებ ნახაზებს.",
  surveyor: "აქ ნახავ ახალ შეკვეთებს შენს რეგიონში, დებ ფასს და მართავ სამუშაოებს.",
  admin: "პლატფორმის მართვა: მომხმარებლები, შეკვეთები, გადახდები და საჩივრები.",
};

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
