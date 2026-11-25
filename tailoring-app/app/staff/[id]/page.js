"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { supabase } from "../../../lib/supabaseClient";

export default function StaffDetailPage() {
  return (
    <ProtectedRoute ownerOnly>
      <StaffDetailContent />
    </ProtectedRoute>
  );
}

function StaffDetailContent() {
  const { id } = useParams();

  const [member, setMember] = useState(null);
  const [orders, setOrders] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [salary, setSalary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    setLoading(true);
    const [{ data: memberData }, { data: orderData }, { data: attendanceData }, { data: salaryData }] =
      await Promise.all([
        supabase.from("staff").select("*").eq("id", id).single(),
        supabase
          .from("orders")
          .select("id, order_number, garment_description, status, due_date, customers(full_name)")
          .eq("assigned_to", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("staff_attendance")
          .select("date, status")
          .eq("staff_id", id)
          .order("date", { ascending: false })
          .limit(14),
        supabase
          .from("staff_salary")
          .select("period, amount_due, amount_paid")
          .eq("staff_id", id)
          .order("period", { ascending: false }),
      ]);

    setMember(memberData || null);
    setOrders(orderData || []);
    setAttendance(attendanceData || []);
    setSalary(salaryData || []);
    setLoading(false);
  }

  async function toggleActive() {
    await supabase.from("staff").update({ is_active: !member.is_active }).eq("id", id);
    loadAll();
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;
  if (!member) return <p className="text-base text-slate-400">Staff member not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{member.full_name}</h1>
          <p className="text-base text-slate-500">
            {member.job_role || member.role}
            {member.phone ? ` · ${member.phone}` : ""}
          </p>
          {!member.is_active && <p className="mt-1 text-base text-red-500">Inactive</p>}
        </div>
        {member.role !== "owner" && (
          <button
            onClick={toggleActive}
            className={`rounded-xl px-4 py-2 text-base font-medium ${
              member.is_active
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {member.is_active ? "Deactivate" : "Reactivate"}
          </button>
        )}
      </div>

      <section className="rounded-3xl border border-violet-100 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          Assigned orders
        </h2>
        {orders.length === 0 && <p className="text-base text-slate-400">No orders assigned.</p>}
        <div className="space-y-2">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-xl border border-violet-100 p-3 text-base hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{o.customers?.full_name || "—"}</p>
                <p className="text-slate-500">{o.garment_description}</p>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-1 text-sm font-medium text-brand-700">
                {o.status}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Recent attendance
          </h2>
          {attendance.length === 0 && <p className="text-base text-slate-400">No attendance marked yet.</p>}
          <div className="space-y-1.5">
            {attendance.map((a) => (
              <div key={a.date} className="flex items-center justify-between text-base">
                <span className="text-slate-500">{new Date(a.date).toLocaleDateString()}</span>
                <span className="font-medium capitalize text-slate-900">{a.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Salary history
          </h2>
          {salary.length === 0 && <p className="text-base text-slate-400">No salary records yet.</p>}
          <div className="space-y-1.5">
            {salary.map((s) => (
              <div key={s.period} className="flex items-center justify-between text-base">
                <span className="text-slate-500">{s.period}</span>
                <span className="font-medium text-slate-900">
                  ₹{s.amount_paid} / ₹{s.amount_due}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
