"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import { CashIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { useToast } from "../../components/ToastProvider";

function currentMonthStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 7);
}

export default function SalaryPage() {
  return (
    <ProtectedRoute ownerOnly>
      <SalaryContent />
    </ProtectedRoute>
  );
}

function SalaryContent() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [staffList, setStaffList] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonthStr());
  const [rows, setRows] = useState({}); // staff_id -> { amount_due, amount_paid, saving }
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStaff() {
      const { data } = await supabase
        .from("staff")
        .select("id, full_name, job_role")
        .eq("is_active", true)
        .order("full_name");
      setStaffList(data || []);
      setLoading(false);
    }
    loadStaff();
    loadHistory();
  }, []);

  useEffect(() => {
    loadPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, staffList]);

  async function loadPeriod() {
    if (staffList.length === 0) return;
    const { data } = await supabase
      .from("staff_salary")
      .select("staff_id, amount_due, amount_paid")
      .eq("period", selectedPeriod);

    const map = {};
    staffList.forEach((s) => {
      const existing = (data || []).find((r) => r.staff_id === s.id);
      map[s.id] = {
        amount_due: existing?.amount_due ?? "",
        amount_paid: existing?.amount_paid ?? "",
        saving: false,
      };
    });
    setRows(map);
  }

  async function loadHistory() {
    const { data } = await supabase
      .from("staff_salary")
      .select("id, period, amount_due, amount_paid, paid_at, staff(full_name)")
      .order("period", { ascending: false })
      .limit(30);
    setHistory(data || []);
  }

  function updateRow(staffId, field, value) {
    setRows((prev) => ({ ...prev, [staffId]: { ...prev[staffId], [field]: value } }));
  }

  async function saveRow(staffId) {
    const row = rows[staffId];
    const amountDue = parseFloat(row.amount_due) || 0;
    const amountPaid = parseFloat(row.amount_paid) || 0;

    setRows((prev) => ({ ...prev, [staffId]: { ...prev[staffId], saving: true } }));

    const { error } = await supabase.from("staff_salary").upsert(
      {
        staff_id: staffId,
        period: selectedPeriod,
        amount_due: amountDue,
        amount_paid: amountPaid,
        paid_at: amountPaid > 0 ? new Date().toISOString() : null,
        recorded_by: user.id,
      },
      { onConflict: "staff_id,period" }
    );

    setRows((prev) => ({ ...prev, [staffId]: { ...prev[staffId], saving: false } }));

    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Salary record saved.");
    loadHistory();
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <div>
      <PageHeader icon={CashIcon} title="Salary" subtitle="Monthly pay per staff member" />

      <section className="rounded-3xl border border-violet-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500">
            Pay period
          </h2>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-base"
          />
        </div>

        {staffList.length === 0 && (
          <p className="text-base text-slate-400">No active staff yet.</p>
        )}

        <div className="space-y-3">
          {staffList.map((s) => {
            const row = rows[s.id] || { amount_due: "", amount_paid: "" };
            const due = parseFloat(row.amount_due) || 0;
            const paid = parseFloat(row.amount_paid) || 0;
            const balance = due - paid;
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-violet-100 p-3"
              >
                <div className="min-w-[120px]">
                  <p className="font-medium text-slate-900">{s.full_name}</p>
                  {s.job_role && <p className="text-sm text-slate-400">{s.job_role}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-500">Amount due</label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount_due}
                    onChange={(e) => updateRow(s.id, "amount_due", e.target.value)}
                    className="w-28 rounded-xl border border-slate-300 px-2 py-1.5 text-base"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-500">Amount paid</label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount_paid}
                    onChange={(e) => updateRow(s.id, "amount_paid", e.target.value)}
                    className="w-28 rounded-xl border border-slate-300 px-2 py-1.5 text-base"
                  />
                </div>
                <p className="text-base text-slate-500">
                  {balance > 0 ? (
                    <span className="text-red-600">₹{balance.toFixed(2)} due</span>
                  ) : (
                    <span className="text-emerald-600">Settled</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => saveRow(s.id)}
                  disabled={row.saving}
                  className="rounded-xl bg-brand-600 px-4 py-1.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
                >
                  {row.saving ? "Saving…" : "Save"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          History
        </h2>
        {history.length === 0 && <p className="text-base text-slate-400">No salary records yet.</p>}
        {history.length > 0 && (
          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Staff</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium">Paid</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-900">{h.staff?.full_name || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{h.period}</td>
                    <td className="px-3 py-2 text-slate-500">₹{h.amount_due}</td>
                    <td className="px-3 py-2 text-slate-500">₹{h.amount_paid}</td>
                    <td className="px-3 py-2">
                      {h.amount_paid >= h.amount_due ? (
                        <span className="text-emerald-600">Settled</span>
                      ) : (
                        <span className="text-red-600">₹{(h.amount_due - h.amount_paid).toFixed(2)} due</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
