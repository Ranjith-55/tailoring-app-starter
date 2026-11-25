"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Clock, Wallet } from "lucide-react";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import { supabase } from "../../lib/supabaseClient";

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function RemindersPage() {
  return (
    <ProtectedRoute>
      <RemindersContent />
    </ProtectedRoute>
  );
}

function RemindersContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, garment_description, status, due_date, total_amount, amount_paid, customers(full_name)")
        .order("due_date", { ascending: true });
      setOrders(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const { urgentToday, tomorrow, pendingPayments, totalCount } = useMemo(() => {
    const today = todayStr();
    const tmrw = tomorrowStr();
    const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));

    const urgentToday = active.filter((o) => o.due_date && o.due_date <= today);
    const tomorrow = active.filter((o) => o.due_date === tmrw);
    const pendingPayments = orders.filter(
      (o) => o.status !== "cancelled" && Number(o.total_amount || 0) - Number(o.amount_paid || 0) > 0
    );

    const uniqueIds = new Set([
      ...urgentToday.map((o) => o.id),
      ...tomorrow.map((o) => o.id),
      ...pendingPayments.map((o) => o.id),
    ]);

    return { urgentToday, tomorrow, pendingPayments, totalCount: uniqueIds.size };
  }, [orders]);

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <div>
      <PageHeader
        icon={Bell}
        title="Activity & Reminders"
        subtitle="Stay on top of urgent orders and pending payments"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={AlertTriangle} accent="text-red-600 bg-red-50" label="Urgent & Today" sub="Needs attention" value={urgentToday.length} />
        <StatCard icon={Clock} accent="text-amber-600 bg-amber-50" label="Tomorrow" sub="Upcoming" value={tomorrow.length} />
        <StatCard icon={Wallet} accent="text-brand-600 bg-brand-50" label="Pending Payments" sub="Awaiting payment" value={pendingPayments.length} />
        <StatCard icon={Bell} accent="text-sky-600 bg-sky-50" label="Total Reminders" sub="All active" value={totalCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Urgent & Today" count={urgentToday.length} border="border-t-red-500">
          {urgentToday.length === 0 && <EmptyState text="No urgent tasks." />}
          {urgentToday.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </Panel>

        <Panel title="Tomorrow" count={tomorrow.length} border="border-t-amber-500">
          {tomorrow.length === 0 && <EmptyState text="No upcoming tasks." />}
          {tomorrow.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </Panel>

        <Panel title="Pending Payments" count={pendingPayments.length} border="border-t-brand-500">
          {pendingPayments.length === 0 && <EmptyState text="No pending payments." />}
          {pendingPayments.map((o) => (
            <OrderRow key={o.id} order={o} showBalance />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, accent, label, sub, value }) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-5">
      <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={20} />
      </span>
      <p className="text-2xl font-black text-ink">{value}</p>
      <p className="text-base text-slate-500">{label}</p>
      <p className="text-sm text-slate-400">{sub}</p>
    </div>
  );
}

function Panel({ title, count, border, children }) {
  return (
    <div className={`rounded-3xl border border-violet-100 border-t-4 bg-white p-5 ${border}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-500">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="py-6 text-center text-base text-slate-400">{text}</p>;
}

function OrderRow({ order, showBalance }) {
  const balance = Number(order.total_amount || 0) - Number(order.amount_paid || 0);
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-xl border border-slate-100 p-3 text-base hover:bg-slate-50"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-900">{order.customers?.full_name || "—"}</span>
        {showBalance ? (
          <span className="font-medium text-red-600">₹{balance}</span>
        ) : (
          order.due_date && (
            <span className="text-sm text-slate-400">{new Date(order.due_date).toLocaleDateString()}</span>
          )
        )}
      </div>
      <p className="text-sm text-slate-500">
        {order.order_number ? `${order.order_number} · ` : ""}
        {order.garment_description}
      </p>
    </Link>
  );
}
