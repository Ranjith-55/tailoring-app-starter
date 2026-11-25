"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import CustomerPicker from "../../components/CustomerPicker";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { CreditCardIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { useToast } from "../../components/ToastProvider";

const TYPE_OPTIONS = [
  { value: "advance", label: "Advance" },
  { value: "balance", label: "Balance" },
  { value: "refund", label: "Refund" },
];

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function PaymentsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<p className="text-base text-slate-400">Loading…</p>}>
        <PaymentsContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function PaymentsContent() {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [amount, setAmount] = useState("");
  const [type, setType] = useState("balance");
  const [method, setMethod] = useState("cash");

  const [recentPayments, setRecentPayments] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      const { data: customerData } = await supabase
        .from("customers")
        .select("id, full_name, phone, customer_code")
        .order("full_name");
      setCustomers(customerData || []);

      const preselectOrderId = searchParams.get("order");
      if (preselectOrderId) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, customer_id")
          .eq("id", preselectOrderId)
          .single();
        if (order && customerData) {
          const match = customerData.find((c) => c.id === order.customer_id);
          if (match) {
            setSelectedCustomer(match);
            setSelectedOrderId(order.id);
          }
        }
      }
    }
    loadInitial();
    loadRecentPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerOrders([]);
      return;
    }
    async function loadOrders() {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, garment_description, total_amount, amount_paid")
        .eq("customer_id", selectedCustomer.id)
        .order("created_at", { ascending: false });
      setCustomerOrders(data || []);
    }
    loadOrders();
  }, [selectedCustomer]);

  async function loadRecentPayments() {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, type, method, paid_at, customers(full_name), orders(order_number)")
      .order("paid_at", { ascending: false })
      .limit(20);
    setRecentPayments(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!selectedCustomer) {
      setError("Pick a customer first.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: paymentError } = await supabase.from("payments").insert({
        order_id: selectedOrderId || null,
        customer_id: selectedCustomer.id,
        amount: amountNum,
        type,
        method,
        received_by: user.id,
      });
      if (paymentError) throw paymentError;

      if (selectedOrderId) {
        const order = customerOrders.find((o) => o.id === selectedOrderId);
        if (order) {
          const delta = type === "refund" ? -amountNum : amountNum;
          const newPaid = (order.amount_paid || 0) + delta;
          const newStatus =
            newPaid <= 0 ? "pending" : newPaid >= order.total_amount ? "paid" : "partial";
          const { error: orderError } = await supabase
            .from("orders")
            .update({ amount_paid: newPaid, payment_status: newStatus })
            .eq("id", selectedOrderId);
          if (orderError) throw orderError;
        }
      }

      showSuccess("Payment recorded.");
      setAmount("");
      setSelectedOrderId("");
      loadRecentPayments();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader icon={CreditCardIcon} title="Payments" subtitle="Advance, balance, and refund payments" />

      <section className="rounded-3xl border border-violet-100 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          Record a payment
        </h2>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-w-lg">
            <CustomerPicker customers={customers} value={selectedCustomer} onChange={setSelectedCustomer} />
          </div>

          {selectedCustomer && (
            <div>
              <label className="mb-1 block text-base font-medium text-slate-700">
                Against order (optional)
              </label>
              <Select
                value={selectedOrderId}
                onChange={setSelectedOrderId}
                className="sm:w-96"
                options={[
                  { value: "", label: "General payment (no specific order)" },
                  ...customerOrders.map((o) => ({
                    value: o.id,
                    label: `${o.order_number ? `${o.order_number} — ` : ""}${o.garment_description} (₹${o.amount_paid}/₹${o.total_amount})`,
                  })),
                ]}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
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
              <label className="mb-1 block text-base font-medium text-slate-700">Type</label>
              <Select value={type} onChange={setType} options={TYPE_OPTIONS} />
            </div>
            <div>
              <label className="mb-1 block text-base font-medium text-slate-700">Method</label>
              <Select value={method} onChange={setMethod} options={METHOD_OPTIONS} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Record payment"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          Recent payments
        </h2>
        {recentPayments.length === 0 && (
          <p className="text-base text-slate-400">No payments recorded yet.</p>
        )}
        {recentPayments.length > 0 && (
          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-900">{p.customers?.full_name || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{p.orders?.order_number || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {p.type === "refund" ? "-" : ""}₹{p.amount}
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-500">{p.type}</td>
                    <td className="px-3 py-2 uppercase text-slate-500">{p.method}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(p.paid_at).toLocaleDateString()}
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
