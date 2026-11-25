"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Client-side hook that gives you the logged-in user AND their role
 * (owner / staff), looked up from the `staff` table.
 *
 * IMPORTANT: this hook is for UI convenience only (showing/hiding
 * buttons). The real security boundary is the Row-Level Security
 * policies in supabase/schema.sql — a staff member could still call
 * the API directly, and RLS is what stops them there.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // row from `staff` table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user ?? null;
      if (!isMounted) return;
      setUser(sessionUser);

      if (sessionUser) {
        const { data: staffRow, error } = await supabase
          .from("staff")
          .select("*")
          .eq("id", sessionUser.id)
          .single();

        if (!error && isMounted) {
          setProfile(staffRow);
        }
      }
      if (isMounted) setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
        } else {
          loadSession();
        }
      }
    );

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return {
    user,
    profile, // { id, full_name, role: 'owner' | 'staff', is_active, ... }
    isOwner: profile?.role === "owner",
    loading,
  };
}
