"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";
import { Bell, ChevronDown, LogOut } from "lucide-react";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/reminders": "Activity & Reminders",
  "/customers": "Customers",
  "/measurements": "Measurements",
  "/orders": "Orders",
  "/payments": "Payments",
  "/staff": "Staff",
  "/attendance": "Attendance",
  "/salary": "Salary",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/templates": "Garment templates",
  "/settings": "Settings",
};

function getTitle(pathname) {
  if (!pathname) return "Tailoring Studio";
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const base = "/" + (pathname.split("/")[1] || "");
  return PAGE_TITLES[base] || "Tailoring Studio";
}

// Quick customer search — presses Enter to jump to the Customers list
// pre-filtered. Full cross-resource search isn't built; this keeps the
// search box honest about what it actually does.
export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function handleSearchKeyDown(e) {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/customers?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const initials = (profile?.full_name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-x-0 top-0 z-20 hidden h-[84px] items-center justify-between gap-3 border-b border-violet-100 bg-white/85 px-4 backdrop-blur md:left-[300px] md:flex lg:px-8">
      <div className="min-w-0 shrink">
        <p className="truncate text-base font-bold text-slate-800">{getTitle(pathname)}</p>
        <p className="hidden truncate text-sm text-slate-400 lg:block">{today}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search customers…"
          className="hidden w-32 rounded-xl border border-violet-100 bg-slate-50 px-3 py-2.5 text-base placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-50 sm:block lg:w-64"
        />
        <button className="relative shrink-0 text-slate-400 hover:text-slate-600" aria-label="Notifications">
          <Bell size={22} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {initials}
            </span>
            <span className="hidden text-base font-medium capitalize text-slate-700 lg:inline">
              {profile?.role}
            </span>
            <ChevronDown size={18} className="hidden text-slate-400 lg:block" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-violet-100 bg-white py-1 shadow-popover">
                <div className="border-b border-violet-100 px-3 py-2.5">
                  <p className="truncate text-base font-semibold text-slate-800">
                    {profile?.full_name || "—"}
                  </p>
                  <p className="text-sm capitalize text-slate-400">{profile?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-base text-slate-600 hover:bg-slate-50"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
