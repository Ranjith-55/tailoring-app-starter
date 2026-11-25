"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";
import {
  Scissors,
  Gauge,
  Bell,
  UsersRound,
  Ruler,
  ClipboardList,
  CreditCard,
  UserRound,
  CalendarDays,
  WalletCards,
  CircleDollarSign,
  FileBarChart,
  Shirt,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge },
      { href: "/reminders", label: "Reminders", icon: Bell },
      { href: "/customers", label: "Customers", icon: UsersRound },
      { href: "/measurements", label: "Measurements", icon: Ruler },
      { href: "/orders", label: "Orders", icon: ClipboardList },
    ],
  },
  {
    label: "People & finance",
    links: [
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/staff", label: "Staff", icon: UserRound, ownerOnly: true },
      { href: "/attendance", label: "Attendance", icon: CalendarDays, ownerOnly: true },
      { href: "/salary", label: "Salary", icon: WalletCards, ownerOnly: true },
      { href: "/expenses", label: "Expenses", icon: CircleDollarSign, ownerOnly: true },
    ],
  },
  {
    label: "Business",
    links: [
      { href: "/reports", label: "Reports", icon: FileBarChart, ownerOnly: true },
      { href: "/templates", label: "Garment templates", icon: Shirt, ownerOnly: true },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isOwner } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.ownerOnly || isOwner),
  })).filter((group) => group.links.length > 0);

  function BrandMark() {
    return (
      <div className="flex items-center gap-3 px-6 py-7">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
          <Scissors size={24} strokeWidth={2} />
        </span>
        <div>
          <p className="text-xl font-black leading-tight tracking-tight text-ink">StitchFlow</p>
          <p className="text-xs font-medium leading-tight text-slate-400">Tailoring Studio</p>
        </div>
      </div>
    );
  }

  function NavLinks() {
    return (
      <nav className="flex flex-1 flex-col gap-5 px-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {group.label}
            </p>
            <div className="flex flex-col">
              {group.links.map((link) => {
                const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`mb-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-base font-semibold ${
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-brand-700"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.9} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[300px] flex-col border-r border-violet-100 bg-white/95 backdrop-blur md:flex">
        <BrandMark />
        <NavLinks />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-violet-100 bg-white px-4 md:hidden">
        <span className="text-base font-black tracking-tight text-ink">StitchFlow</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[285px] flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-base font-black tracking-tight text-ink">StitchFlow</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <NavLinks />
            <button
              onClick={handleLogout}
              className="mx-3 mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
