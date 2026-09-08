import React, { useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthScreen from "./views/AuthScreen";
import ClientView from "./views/ClientView";
import SurveyorView from "./views/SurveyorView";
import AdminView from "./views/AdminView";
import { Spinner } from "./components/UI";
import Logo from "./components/Logo";

export const APP_VERSION = "v15";

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

  if (!session) return <div className="app app-solo"><AuthScreen /></div>;

  // ავტორიზებულია, მაგრამ პროფილი არ არსებობს
  // (ხდება მაშინ, როცა email confirmation ჩართულია და პროფილი ვერ ჩაიწერა)
  if (!profile) {
    return (
      <div className="app app-solo">
        <div style={{ padding: 24 }}>
          <div className="warn" style={{ marginBottom: 12 }}>
            ანგარიში არსებობს, მაგრამ პროფილი ვერ მოიძებნა. ეს ხდება მაშინ, როცა
            Supabase-ში ჩართულია „Confirm email" და რეგისტრაცია დადასტურებამდე შეწყდა.
          </div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            გამოსავალი: Supabase → Authentication → Providers → Email → გამორთე
            „Confirm email" (სატესტოდ), წაშალე ეს მომხმარებელი და თავიდან დარეგისტრირდი.
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
      <div className="hdr">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Logo size={24} light sub={roleLabel} />
          <div className="who"><b>{profile.full_name}</b><span className="mono" style={{ fontSize: 10, opacity: .55 }}>v15</span></div>
        </div>
      </div>
      <div className="grid-band" />

      {profile.role === "client" && <ClientView toast={toast} />}
      {profile.role === "surveyor" && <SurveyorView toast={toast} />}
      {profile.role === "admin" && <AdminView toast={toast} />}
    </div>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
