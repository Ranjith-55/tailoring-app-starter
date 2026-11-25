"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/useAuth";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * Wrap any page's content with this. Redirects to /login if not
 * signed in. Pass ownerOnly to also redirect staff away from
 * owner-only pages (e.g. /staff) — this is a UX convenience, the
 * real enforcement is Supabase RLS (see supabase/schema.sql).
 */
export default function ProtectedRoute({ children, ownerOnly = false }) {
  const router = useRouter();
  const { user, isOwner, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (ownerOnly && !isOwner) {
      router.replace("/dashboard");
    }
  }, [user, isOwner, loading, ownerOnly, router]);

  if (loading || !user || (ownerOnly && !isOwner)) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <Topbar />
      <main className="p-4 pt-20 sm:p-6 md:pl-[calc(300px+2rem)] md:pr-8 md:pt-32">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
