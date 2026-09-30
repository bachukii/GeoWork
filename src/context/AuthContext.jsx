import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, configured } from "../lib/supabase";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// პროფილის ველები signUp-ის metadata-დან (იგივე წესით, რაც handle_new_user trigger-ში)
function profileFromMeta(user) {
  const m = user?.user_metadata || {};
  if (m.role !== "client" && m.role !== "surveyor") return null;
  const isSurveyor = m.role === "surveyor";
  return {
    id: user.id,
    role: m.role,
    full_name: (m.full_name || "").trim() || (user.email || "").split("@")[0],
    phone: m.phone || null,
    user_type: m.user_type === "company" ? "company" : "individual",
    company_name: m.company_name || null,
    company_id: m.company_id || null,
    website: m.website || null,
    experience: isSurveyor ? Number(m.experience) || 0 : 0,
    bio: m.bio || null,
    regions: isSurveyor && Array.isArray(m.regions) ? m.regions : [],
    services: isSurveyor && Array.isArray(m.services) ? m.services : [],
    verified: false,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const user = session?.user;
  const userId = user?.id;

  const loadProfile = useCallback(async (uid, u) => {
    if (!uid) { setProfile(null); return null; }
    let { data, error } = await supabase
      .from("profiles").select("*").eq("id", uid).maybeSingle();

    // პროფილი არ არის (trigger არ გაეშვა / ძველი ანგარიში) — ვქმნით metadata-დან
    if (!error && !data && u) {
      const row = profileFromMeta(u);
      if (row) {
        const ins = await supabase.from("profiles").insert(row).select("*").maybeSingle();
        if (ins.error && !/duplicate key/i.test(ins.error.message)) console.error("profile create", ins.error);
        ({ data, error } = ins.data ? ins
          : await supabase.from("profiles").select("*").eq("id", uid).maybeSingle());
      }
    }

    if (error) { console.error("profile load", error); setProfile(null); return null; }
    setProfile(data);
    return data;
  }, []);

  // session. onAuthStateChange-ში Supabase-ის სხვა მოთხოვნებს არ ვიძახებთ —
  // supabase-js ამ დროს auth lock-ს ფლობს და await შეიძლება სამუდამოდ გაიჭედოს.
  useEffect(() => {
    if (!configured) { setSessionReady(true); return; }
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setSessionReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (alive) setSession(s);
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // პროფილი — მხოლოდ მაშინ, როცა მომხმარებელი იცვლება
  useEffect(() => {
    if (!sessionReady) return;
    if (!userId) { setProfile(null); setProfileReady(true); return; }
    let alive = true;
    setProfileReady(false);
    loadProfile(userId, user).finally(() => { if (alive) setProfileReady(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sessionReady, loadProfile]);

  const loading = !sessionReady || (!!userId && !profileReady);

  // ---------- რეგისტრაცია ----------
  // პროფილს ბაზა ქმნის (trigger handle_new_user, supabase/migration_v5.sql)
  // იმ მონაცემებით, რომლებსაც აქ metadata-ში ვატანთ. ამიტომ მუშაობს
  // ჩართული „Confirm email"-ითაც. role-ს trigger მხოლოდ client/surveyor-ად იღებს.
  const signUp = async ({ email, password, role, fields }) => {
    const isSurveyor = role === "surveyor";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fields.fullName,
          phone: fields.phone || null,
          user_type: fields.userType || "individual",
          company_name: fields.companyName || null,
          company_id: fields.companyId || null,
          website: fields.website || null,
          experience: isSurveyor ? String(Number(fields.experience) || 0) : "0",
          bio: fields.bio || null,
          regions: isSurveyor ? (fields.regions || []) : [],
          services: isSurveyor ? (fields.services || []) : [],
        },
      },
    });
    if (error) throw error;

    // session-ის შემთხვევაში პროფილს ზედა useEffect ტვირთავს
    return { needsConfirmation: !data.session, user: data.user };
  };

  const signIn = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (patch) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
    await loadProfile(userId, user);
  };

  return (
    <AuthCtx.Provider value={{
      session, profile, loading, configured,
      signUp, signIn, signOut, updateProfile, reloadProfile: () => loadProfile(userId, user),
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
