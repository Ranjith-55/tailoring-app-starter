"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import { ChartIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";

function currentMonthStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 7);
}

function lastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default function ReportsPage() {
  return (
    <ProtectedRoute ownerOnly>
      <ReportsContent />
    </ProtectedRoute>
  );
}

function ReportsContent() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salary, setSalary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [exporting, setExporting] = useState(false);

  const months = useMemo(() => lastNMonths(6), []);

  useEffect(() => {
    async function loadAll() {
      const [
        { data: ordersData },
        { data: itemsData },
        { data: paymentsData },
        { data: expensesData },
        { data: salaryData },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, garment_description, total_amount, amount_paid, status, created_at, due_date, customers(full_name)"
          )
          .order("created_at", { ascending: false }),
        supabase.from("order_items").select("order_id, garment_type, amount"),
        supabase
          .from("payments")
          .select("id, amount, type, method, paid_at, order_id, customers(full_name), orders(order_number)")
          .order("paid_at", { ascending: false }),
        supabase
          .from("expenses")
          .select("category, amount, description, spent_at")
          .order("spent_at", { ascending: false }),
        supabase.from("staff_salary").select("period, amount_due, amount_paid, staff(full_name)"),
      ]);
      setOrders(ordersData || []);
      setOrderItems(itemsData || []);
      setPayments(paymentsData || []);
      setExpenses(expensesData || []);
      setSalary(salaryData || []);
      setLoading(false);
    }
    loadAll();
  }, []);

  const monthlyRevenue = useMemo(() => {
    const map = {};
    months.forEach((m) => (map[m] = 0));
    payments.forEach((p) => {
      const m = (p.paid_at || "").slice(0, 7);
      if (m in map) map[m] += p.type === "refund" ? -Number(p.amount) : Number(p.amount);
    });
    return map;
  }, [payments, months]);

  const monthlyOrderCount = useMemo(() => {
    const map = {};
    months.forEach((m) => (map[m] = 0));
    orders.forEach((o) => {
      const m = (o.created_at || "").slice(0, 7);
      if (m in map) map[m] += 1;
    });
    return map;
  }, [orders, months]);

  const busiestGarments = useMemo(() => {
    const map = {};
    orderItems.forEach((i) => {
      if (!map[i.garment_type]) map[i.garment_type] = { count: 0, amount: 0 };
      map[i.garment_type].count += 1;
      map[i.garment_type].amount += Number(i.amount || 0);
    });
    return Object.entries(map)
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [orderItems]);

  const accounts = useMemo(() => {
    const monthPayments = payments.filter((p) => (p.paid_at || "").slice(0, 7) === selectedMonth);
    const income = monthPayments.reduce(
      (sum, p) => sum + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)),
      0
    );
    const monthExpenses = expenses.filter((e) => (e.spent_at || "").slice(0, 7) === selectedMonth);
    const expensesTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const monthSalary = salary.filter((s) => s.period === selectedMonth);
    const salaryTotal = monthSalary.reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);
    return { income, expensesTotal, salaryTotal, net: income - expensesTotal - salaryTotal };
  }, [payments, expenses, salary, selectedMonth]);

  const maxRevenue = Math.max(1, ...Object.values(monthlyRevenue));

  function handleExport() {
    setExporting(true);
    try {
      const monthOrders = orders
        .filter((o) => (o.created_at || "").slice(0, 7) === selectedMonth)
        .map((o) => ({
          "Order #": o.order_number,
          Customer: o.customers?.full_name || "",
          Garment: o.garment_description,
          Total: o.total_amount,
          Paid: o.amount_paid,
          Status: o.status,
          "Due date": o.due_date || "",
        }));
      const monthPayments = payments
        .filter((p) => (p.paid_at || "").slice(0, 7) === selectedMonth)
        .map((p) => ({
          Date: p.paid_at?.slice(0, 10),
          Customer: p.customers?.full_name || "",
          Order: p.orders?.order_number || "",
          Amount: p.amount,
          Type: p.type,
          Method: p.method,
        }));
      const monthExpenses = expenses
        .filter((e) => (e.spent_at || "").slice(0, 7) === selectedMonth)
        .map((e) => ({
          Date: e.spent_at,
          Category: e.category,
          Description: e.description || "",
          Amount: e.amount,
        }));
      const monthSalary = salary
        .filter((s) => s.period === selectedMonth)
        .map((s) => ({
          Staff: s.staff?.full_name || "",
          Period: s.period,
          "Amount due": s.amount_due,
          "Amount paid": s.amount_paid,
        }));
      const summary = [
        { Metric: "Income (payments)", Amount: accounts.income },
        { Metric: "Expenses", Amount: -accounts.expensesTotal },
        { Metric: "Salary paid", Amount: -accounts.salaryTotal },
        { Metric: "Net", Amount: accounts.net },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthOrders), "Orders");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthPayments), "Payments");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthExpenses), "Expenses");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthSalary), "Salary");
      XLSX.writeFile(wb, `tailoring-report-${selectedMonth}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <div>
      <PageHeader icon={ChartIcon} title="Reports" subtitle="Collections, garment mix, and accounts" />

      <section className="rounded-3xl border border-violet-100 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold uppercase tracking-wide text-slate-500">
          Collections — last 6 months
        </h2>
        <div className="flex items-end gap-3" style={{ height: 140 }}>
          {months.map((m) => (
            <div key={m} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-sm text-slate-500">₹{monthlyRevenue[m].toFixed(0)}</span>
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${Math.max(4, (monthlyRevenue[m] / maxRevenue) * 100)}px` }}
              />
              <span className="text-sm text-slate-400">{m.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Busiest garment types
          </h2>
          {busiestGarments.length === 0 && <p className="text-base text-slate-400">No orders yet.</p>}
          <div className="space-y-2">
            {busiestGarments.map((g) => (
              <div key={g.type} className="flex items-center justify-between text-base">
                <span className="capitalize text-slate-700">{g.type.replace(/_/g, " ")}</span>
                <span className="text-slate-500">
                  {g.count} orders · ₹{g.amount.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Orders per month
          </h2>
          <div className="space-y-1.5">
            {months.map((m) => (
              <div key={m} className="flex items-center justify-between text-base">
                <span className="text-slate-500">{m}</span>
                <span className="font-medium text-slate-900">{monthlyOrderCount[m]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500">
            Accounts &amp; export
          </h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Income</p>
            <p className="text-lg font-semibold text-emerald-600">₹{accounts.income.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Expenses</p>
            <p className="text-lg font-semibold text-red-600">₹{accounts.expensesTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Salary paid</p>
            <p className="text-lg font-semibold text-red-600">₹{accounts.salaryTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Net</p>
            <p className={`text-lg font-semibold ${accounts.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              ₹{accounts.net.toFixed(2)}
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
        >
          {exporting ? "Exporting…" : `Export ${selectedMonth} to Excel`}
        </button>
      </section>
    </div>
  );
}
