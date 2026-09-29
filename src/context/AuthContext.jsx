import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, configured } from "../lib/supabase";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return null; }
    const { data, error } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) { console.error("profile load", error); setProfile(null); return null; }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    let alive = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!alive) return;
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

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

    const user = data.user;
    if (!data.session) return { needsConfirmation: true, user };

    await loadProfile(user.id);
    return { needsConfirmation: false, user };
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
    const { error } = await supabase.from("profiles").update(patch).eq("id", session.user.id);
    if (error) throw error;
    await loadProfile(session.user.id);
  };

  return (
    <AuthCtx.Provider value={{
      session, profile, loading, configured,
      signUp, signIn, signOut, updateProfile, reloadProfile: () => loadProfile(session?.user?.id),
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
