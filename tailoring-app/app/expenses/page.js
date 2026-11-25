"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { ReceiptIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { useToast } from "../../components/ToastProvider";

const CATEGORIES = ["rent", "materials", "utilities", "wages", "other"];

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  return (
    <ProtectedRoute ownerOnly>
      <ExpensesContent />
    </ProtectedRoute>
  );
}

function ExpensesContent() {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [category, setCategory] = useState("materials");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [spentAt, setSpentAt] = useState(todayStr());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("spent_at", { ascending: false })
      .limit(50);
    setExpenses(data || []);
    setLoading(false);
  }

  const thisMonthTotal = expenses
    .filter((e) => e.spent_at.slice(0, 7) === todayStr().slice(0, 7))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from("expenses").insert({
      category,
      amount: amountNum,
      description: description || null,
      spent_at: spentAt,
      recorded_by: user.id,
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    showSuccess("Expense logged.");
    setAmount("");
    setDescription("");
    loadExpenses();
  }

  return (
    <div>
      <PageHeader icon={ReceiptIcon} title="Expenses" subtitle="Shop expenses by category" />

      <div className="mb-6 rounded-3xl border border-violet-100 bg-white p-5">
        <p className="text-base text-slate-500">This month's expenses</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">₹{thisMonthTotal.toFixed(2)}</p>
      </div>

      <section className="rounded-3xl border border-violet-100 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          Log an expense
        </h2>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-base font-medium text-slate-700">Category</label>
            <Select value={category} onChange={setCategory} options={CATEGORIES} />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium text-slate-700">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium text-slate-700">Description</label>
            <input
              type="text"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-6 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Log expense"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          Recent expenses
        </h2>
        {loading && <p className="text-base text-slate-400">Loading…</p>}
        {!loading && expenses.length === 0 && (
          <p className="text-base text-slate-400">No expenses logged yet.</p>
        )}
        {expenses.length > 0 && (
          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(e.spent_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-900">{e.category}</td>
                    <td className="px-3 py-2 text-slate-500">{e.description || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">₹{e.amount}</td>
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
