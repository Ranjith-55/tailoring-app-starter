"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import CustomerPicker from "../../../components/CustomerPicker";
import Select from "../../../components/ui/Select";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../lib/useAuth";
import { useGarmentTemplates } from "../../../lib/useGarmentTemplates";
import { useToast } from "../../../components/ToastProvider";

function emptyItem(defaultType) {
  return { garment_type: defaultType || "", description: "", amount: "" };
}

export default function NewOrderPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<p className="text-base text-slate-400">Loading…</p>}>
        <NewOrderForm />
      </Suspense>
    </ProtectedRoute>
  );
}

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const { templates: garmentTemplates } = useGarmentTemplates();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [measurements, setMeasurements] = useState([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState("");

  const [items, setItems] = useState([emptyItem()]);
  const [dueDate, setDueDate] = useState("");
  const [advance, setAdvance] = useState("0");
  const [staffList, setStaffList] = useState([]);
  const [assignedTo, setAssignedTo] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      const [{ data: customerData }, { data: staffData }] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, phone, customer_code")
          .order("full_name"),
        supabase
          .from("staff")
          .select("id, full_name, job_role")
          .eq("is_active", true)
          .order("full_name"),
      ]);
      setCustomers(customerData || []);
      setStaffList(staffData || []);

      const preselectId = searchParams.get("customer");
      if (preselectId && customerData) {
        const match = customerData.find((c) => c.id === preselectId);
        if (match) setSelectedCustomer(match);
      }
    }
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCustomer) {
      setMeasurements([]);
      setSelectedMeasurementId("");
      return;
    }
    async function loadMeasurements() {
      const { data } = await supabase
        .from("measurements")
        .select("id, garment_type, recorded_at, version_label")
        .eq("customer_id", selectedCustomer.id)
        .order("recorded_at", { ascending: false });
      setMeasurements(data || []);
    }
    loadMeasurements();
  }, [selectedCustomer]);

  useEffect(() => {
    if (garmentTemplates.length === 0) return;
    setItems((prev) =>
      prev.map((it) => (it.garment_type ? it : { ...it, garment_type: garmentTemplates[0].type_key }))
    );
  }, [garmentTemplates]);

  const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem(garmentTemplates[0]?.type_key)]);
  }

  function removeItem(idx) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!selectedCustomer) {
      setError("Pick a customer first.");
      return;
    }
    const validItems = items.filter((i) => i.garment_type && parseFloat(i.amount) > 0);
    if (validItems.length === 0) {
      setError("Add at least one garment with an amount.");
      return;
    }

    setSubmitting(true);

    const advanceAmount = parseFloat(advance) || 0;
    const totalAmount = validItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const paymentStatus =
      advanceAmount <= 0 ? "pending" : advanceAmount >= totalAmount ? "paid" : "partial";
    const garmentSummary = validItems
      .map((i) => garmentTemplates.find((g) => g.type_key === i.garment_type)?.label || i.garment_type)
      .join(", ");

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: selectedCustomer.id,
          measurement_id: selectedMeasurementId || null,
          garment_description: garmentSummary,
          status: "new",
          total_amount: totalAmount,
          amount_paid: advanceAmount,
          payment_status: paymentStatus,
          due_date: dueDate || null,
          assigned_to: assignedTo || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        validItems.map((i) => ({
          order_id: order.id,
          garment_type: i.garment_type,
          description: i.description || null,
          amount: parseFloat(i.amount) || 0,
        }))
      );
      if (itemsError) throw itemsError;

      if (advanceAmount > 0) {
        const { error: paymentError } = await supabase.from("payments").insert({
          order_id: order.id,
          customer_id: selectedCustomer.id,
          amount: advanceAmount,
          type: "advance",
          method: "cash",
          received_by: user.id,
        });
        if (paymentError) throw paymentError;
      }

      showSuccess("Order created.");
      router.push("/orders");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">New order</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-violet-100 bg-white p-6">
        <section>
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Customer
          </h2>

          <CustomerPicker customers={customers} value={selectedCustomer} onChange={setSelectedCustomer} />
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Measurement used (optional)
          </h2>
          <Select
            value={selectedMeasurementId}
            onChange={setSelectedMeasurementId}
            disabled={!selectedCustomer || measurements.length === 0}
            options={[
              { value: "", label: "No specific measurement" },
              ...measurements.map((m) => ({
                value: m.id,
                label: `${m.garment_type.replace(/_/g, " ")} — ${new Date(m.recorded_at).toLocaleDateString()}${m.version_label ? ` (${m.version_label})` : ""}`,
              })),
            ]}
          />
          {selectedCustomer && measurements.length === 0 && (
            <p className="mt-1 text-sm text-slate-400">
              No saved measurements for this customer yet — the order can still be created.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Garments
          </h2>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-start gap-2 rounded-xl border border-violet-100 p-3">
                <Select
                  value={item.garment_type}
                  onChange={(v) => updateItem(idx, "garment_type", v)}
                  className="w-40 shrink-0"
                  options={garmentTemplates.map((g) => ({ value: g.type_key, label: g.label }))}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  className="min-w-[140px] flex-1 rounded-xl border border-slate-300 px-2 py-1.5 text-base"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={item.amount}
                  onChange={(e) => updateItem(idx, "amount", e.target.value)}
                  className="w-28 rounded-xl border border-slate-300 px-2 py-1.5 text-base"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="rounded-xl px-2 py-1.5 text-base text-slate-400 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove garment"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-3 text-base font-medium text-brand-600 hover:underline"
          >
            + Add another garment
          </button>
          <p className="mt-3 text-base font-medium text-slate-700">Total: ₹{total.toFixed(2)}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-base font-medium text-slate-700">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-base font-medium text-slate-700">
              Advance received (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
        </section>

        <section>
          <label className="mb-1 block text-base font-medium text-slate-700">
            Assign to staff (optional)
          </label>
          <Select
            value={assignedTo}
            onChange={setAssignedTo}
            className="sm:w-64"
            options={[
              { value: "", label: "Unassigned" },
              ...staffList.map((s) => ({
                value: s.id,
                label: `${s.full_name}${s.job_role ? ` — ${s.job_role}` : ""}`,
              })),
            ]}
          />
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create order"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="rounded-xl border border-slate-300 px-6 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
