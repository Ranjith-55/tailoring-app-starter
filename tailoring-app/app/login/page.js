"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Mail, Lock, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const HIGHLIGHTS = [
  "Track every order end-to-end",
  "Staff attendance & salary, sorted",
  "Customer measurements, always on hand",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Decorative brand panel — desktop/tablet-landscape only. Mobile gets
          a compact header instead (below) so the animated blobs don't eat
          the viewport on small screens. */}
      <div className="relative hidden w-1/2 shrink-0 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-fuchsia-600 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="absolute -left-24 -top-24 h-80 w-80 animate-blob rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute bottom-0 right-0 h-96 w-96 animate-blob rounded-full bg-fuchsia-400/20 blur-3xl [animation-delay:2s]"
        />
        <div
          aria-hidden
          className="absolute left-1/3 top-1/2 h-64 w-64 animate-blob rounded-full bg-brand-300/20 blur-3xl [animation-delay:4s]"
        />

        <div className="relative z-10 flex animate-rise-in items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/20 backdrop-blur">
            <Scissors size={24} strokeWidth={2} />
          </span>
          <div>
            <p className="text-xl font-black leading-tight tracking-tight text-white">StitchFlow</p>
            <p className="text-xs font-medium leading-tight text-brand-100">Tailoring Studio</p>
          </div>
        </div>

        <div className="relative z-10">
          <p
            className="mb-6 animate-rise-in text-3xl font-black leading-tight tracking-tight text-white [animation-delay:100ms] xl:text-4xl"
          >
            Run your tailoring shop from one calm screen.
          </p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item, i) => (
              <li
                key={item}
                className="flex animate-rise-in items-center gap-3 text-base text-brand-50"
                style={{ animationDelay: `${180 + i * 90}ms` }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/20">
                  <Check size={14} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 animate-rise-in text-sm text-brand-100/80 [animation-delay:500ms]">
          Built for owners &amp; staff — no public sign-up.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Compact brand header — mobile/tablet-portrait only. */}
          <div className="mb-8 flex animate-rise-in items-center gap-2.5 lg:hidden">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
              <Scissors size={22} strokeWidth={2} />
            </span>
            <div>
              <p className="text-lg font-black leading-tight tracking-tight text-ink">StitchFlow</p>
              <p className="text-[11px] font-medium leading-tight text-slate-400">Tailoring Studio</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full animate-scale-in rounded-3xl bg-white p-8 shadow-card ring-1 ring-violet-100"
          >
            <div className="mb-7 animate-rise-in [animation-delay:60ms]">
              <h1 className="text-2xl font-black tracking-tight text-ink">Welcome back</h1>
              <p className="mt-1 text-base text-slate-500">Sign in to your admin panel</p>
            </div>

            {error && (
              <div className="mb-4 animate-rise-in rounded-xl bg-red-50 px-3 py-2.5 text-base text-red-700">
                {error}
              </div>
            )}

            <div className="mb-4 animate-rise-in [animation-delay:110ms]">
              <label className="mb-1 block text-base font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-base transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-50"
                  placeholder="owner@yourshop.com"
                />
              </div>
            </div>

            <div className="mb-6 animate-rise-in [animation-delay:160ms]">
              <label className="mb-1 block text-base font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-base transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full animate-rise-in items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700 hover:shadow-brand-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 [animation-delay:200ms]"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {submitting ? "Signing in…" : "Sign in"}
            </button>

            <p className="mt-5 animate-rise-in text-center text-sm text-slate-400 [animation-delay:240ms]">
              No public sign-up — accounts are created by the owner from the Staff page.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
