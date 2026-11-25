"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";

const STATUS_DOT = {
  new: "bg-slate-400",
  stitching: "bg-brand-500",
  ready: "bg-emerald-500",
  delivered: "bg-slate-300",
  cancelled: "bg-red-400",
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    ordersInProgress: 0,
    pendingPayments: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [{ count: customerCount }, { count: ordersCount }, { count: pendingCount }] =
        await Promise.all([
          supabase.from("customers").select("id", { count: "exact", head: true }),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .neq("status", "delivered"),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .neq("payment_status", "paid"),
        ]);

      setStats({
        totalCustomers: customerCount || 0,
        ordersInProgress: ordersCount || 0,
        pendingPayments: pendingCount || 0,
      });
    }

    async function loadRecentOrders() {
      setLoadingOrders(true);
      const { data } = await supabase
        .from("orders")
        .select("id, garment_description, status, amount_paid, total_amount, customers(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOrders(data || []);
      setLoadingOrders(false);
    }

    loadStats();
    loadRecentOrders();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">
        Welcome, {profile?.full_name || "there"}
      </h1>
      <p className="mt-1 text-base text-slate-500">
        You're logged in as <span className="font-medium text-slate-700">{profile?.role}</span>.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total customers" value={stats.totalCustomers} />
        <StatCard label="Orders in progress" value={stats.ordersInProgress} />
        <StatCard label="Orders with balance due" value={stats.pendingPayments} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/customers/new"
          className="rounded-xl bg-brand-600 px-4 py-2 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700"
        >
          + Add customer
        </Link>
        <Link
          href="/orders"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
        >
          View orders board
        </Link>
      </div>

      <h2 className="mb-3 mt-10 text-base font-semibold uppercase tracking-wide text-slate-500">
        Recent orders
      </h2>

      {loadingOrders && <p className="text-base text-slate-400">Loading…</p>}
      {!loadingOrders && recentOrders.length === 0 && (
        <p className="text-base text-slate-400">No orders yet.</p>
      )}

      {recentOrders.length > 0 && (
        <div className="scrollbar-thin overflow-x-auto rounded-3xl border border-violet-100 bg-white">
          <table className="w-full text-left text-base">
            <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Garment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {o.customers?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{o.garment_description}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[o.status] || "bg-slate-300"}`} />
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    ₹{o.amount_paid || 0} / ₹{o.total_amount || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
      <p className="text-base text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-ink">{value}</p>
    </div>
  );
}
