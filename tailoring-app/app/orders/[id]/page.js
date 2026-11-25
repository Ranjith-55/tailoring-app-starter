"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../../components/ProtectedRoute";
import WhatsAppButton from "../../../components/WhatsAppButton";
import ReworkModal from "../../../components/ReworkModal";
import Select from "../../../components/ui/Select";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../lib/useAuth";
import { useToast } from "../../../components/ToastProvider";
import { messageTemplates } from "../../../lib/whatsapp";
import { useShopName } from "../../../lib/useShopName";
import { formatMeasurementSummary } from "../../../lib/formatMeasurement";

const STATUS_OPTIONS = ["new", "stitching", "ready", "delivered", "cancelled"];
const PAYMENT_OPTIONS = ["pending", "partial", "paid"];

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <OrderDetailContent />
    </ProtectedRoute>
  );
}

function OrderDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const { showSuccess, showError } = useToast();
  const shopName = useShopName();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [measurement, setMeasurement] = useState(null);
  const [payments, setPayments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkSubmitting, setReworkSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    setLoading(true);
    const [{ data: orderData }, { data: itemsData }, { data: paymentsData }, { data: staffData }] =
      await Promise.all([
        supabase
          .from("orders")
          .select("*, customers(id, full_name, phone), assigned:assigned_to(id, full_name)")
          .eq("id", id)
          .single(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("payments").select("*").eq("order_id", id).order("paid_at", { ascending: false }),
        supabase.from("staff").select("id, full_name, job_role").eq("is_active", true).order("full_name"),
      ]);

    setOrder(orderData || null);
    setItems(itemsData || []);
    setPayments(paymentsData || []);
    setStaffList(staffData || []);

    if (orderData?.measurement_id) {
      const { data: measurementData } = await supabase
        .from("measurements")
        .select("*")
        .eq("id", orderData.measurement_id)
        .single();
      setMeasurement(measurementData || null);
    } else {
      setMeasurement(null);
    }

    setLoading(false);
  }

  async function updateField(fields) {
    const { error } = await supabase.from("orders").update(fields).eq("id", id);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Order updated.");
    loadAll();
  }

  async function handleStatusChange(newStatus) {
    if (newStatus === "issue_rework") {
      setReworkOpen(true);
      return;
    }
    // `is_rework` is a permanent record once set — it stays true across
    // every later status change, so "this order was reworked" stays visible
    // even after it's Ready/Delivered again, not just while it's Stitching.
    await updateField({ status: newStatus });
    await supabase.from("order_status_history").insert({
      order_id: id,
      status: newStatus,
      payment_status: order.payment_status,
      changed_by: user.id,
    });
  }

  async function handleReworkConfirm(dueDate, note) {
    setReworkSubmitting(true);

    const { error } = await supabase
      .from("orders")
      .update({ status: "stitching", due_date: dueDate, is_rework: true, rework_note: note })
      .eq("id", id);

    if (error) {
      setReworkSubmitting(false);
      showError(error.message);
      return;
    }

    const { error: historyError } = await supabase.from("order_status_history").insert({
      order_id: id,
      status: "stitching",
      payment_status: order.payment_status,
      changed_by: user.id,
      note,
    });
    if (historyError) {
      // `note` column not migrated yet on this database — log the status
      // change anyway, just without the note, rather than losing it entirely.
      await supabase.from("order_status_history").insert({
        order_id: id,
        status: "stitching",
        payment_status: order.payment_status,
        changed_by: user.id,
      });
      showError("Reopened, but the rework note wasn't saved — run the pending database migration (see FEATURES.md).");
    } else {
      showSuccess("Order reopened for rework with a new delivery date.");
    }

    setReworkSubmitting(false);
    setReworkOpen(false);
    loadAll();
  }

  async function handlePaymentStatusChange(newPaymentStatus) {
    await updateField({ payment_status: newPaymentStatus });
    await supabase.from("order_status_history").insert({
      order_id: id,
      status: order.status,
      payment_status: newPaymentStatus,
      changed_by: user.id,
    });
  }

  async function handleDelete() {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Order deleted.");
    router.push("/orders");
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;
  if (!order) return <p className="text-base text-slate-400">Order not found.</p>;

  const balance = (order.total_amount || 0) - (order.amount_paid || 0);
  const customerName = order.customers?.full_name || "Customer";
  const message =
    order.status === "delivered"
      ? messageTemplates.orderCompleted({ name: customerName, garment: order.garment_description, shopName })
      : order.status === "ready"
      ? messageTemplates.orderReady({ name: customerName, garment: order.garment_description, shopName })
      : messageTemplates.statusUpdate({
          name: customerName,
          garment: order.garment_description,
          status: order.status,
          shopName,
        });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              {order.order_number || id.slice(0, 8)}
            </p>
            {order.is_rework && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700">
                Issue / Rework
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{order.garment_description}</h1>
          <Link href={`/customers/${order.customers?.id}`} className="text-base text-brand-600 hover:underline">
            {customerName}
          </Link>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="rounded-xl border border-red-300 px-4 py-2 text-base font-medium text-red-600 hover:bg-red-50"
          >
            Delete order
          </button>
        )}
      </div>

      {order.is_rework && order.rework_note && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-base text-amber-800">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-600">Rework note</p>
          {order.rework_note}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">Status</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">Order status</label>
              <Select
                value={order.status}
                onChange={handleStatusChange}
                options={
                  order.status === "delivered"
                    ? [{ value: "issue_rework", label: "Issue / Rework" }]
                    : STATUS_OPTIONS
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">Payment status</label>
              <Select
                value={order.payment_status}
                onChange={handlePaymentStatusChange}
                options={PAYMENT_OPTIONS}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">Due date</label>
              <input
                type="date"
                value={order.due_date || ""}
                onChange={(e) => updateField({ due_date: e.target.value || null })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">Assigned to</label>
              <Select
                value={order.assigned_to || ""}
                onChange={(v) => updateField({ assigned_to: v || null })}
                options={[
                  { value: "", label: "Unassigned" },
                  ...staffList.map((s) => ({
                    value: s.id,
                    label: s.full_name + (s.job_role ? ` — ${s.job_role}` : ""),
                  })),
                ]}
                className="w-full"
              />
            </div>
          </div>

          {order.customers?.phone && (
            <div className="mt-4">
              <WhatsAppButton phone={order.customers.phone} message={message} />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">Payment</h2>
          <p className="text-base text-slate-700">
            ₹{order.amount_paid || 0} / ₹{order.total_amount || 0}
            {balance > 0 && <span className="ml-1 text-red-500">(₹{balance} due)</span>}
          </p>
          <Link
            href={`/payments?order=${id}`}
            className="mt-2 inline-block text-base font-medium text-brand-600 hover:underline"
          >
            + Record a payment
          </Link>

          <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">History</h3>
          {payments.length === 0 && <p className="text-base text-slate-400">No payments yet.</p>}
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-violet-100 p-2 text-base">
                <span className="capitalize text-slate-600">
                  {p.type} · {p.method}
                </span>
                <span className="text-slate-500">{new Date(p.paid_at).toLocaleDateString()}</span>
                <span className="font-medium text-slate-900">₹{p.amount}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">Garments</h2>
        {items.length === 0 && <p className="text-base text-slate-400">No line items recorded.</p>}
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl border border-violet-100 p-3 text-base">
              <div>
                <p className="font-medium capitalize text-slate-900">{i.garment_type.replace(/_/g, " ")}</p>
                {i.description && <p className="text-slate-500">{i.description}</p>}
              </div>
              <span className="font-medium text-slate-700">₹{i.amount}</span>
            </div>
          ))}
        </div>
      </section>

      {measurement && (
        <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Measurement used
          </h2>
          <p className="mb-1 font-medium capitalize text-slate-900">
            {measurement.garment_type.replace(/_/g, " ")}
          </p>
          <p className="text-base text-slate-500">{formatMeasurementSummary(measurement.values)}</p>
          <p className="mt-1 text-sm text-slate-400">
            Recorded {new Date(measurement.recorded_at).toLocaleDateString()}
          </p>
        </section>
      )}

      <ReworkModal
        open={reworkOpen}
        onClose={() => setReworkOpen(false)}
        onConfirm={handleReworkConfirm}
        submitting={reworkSubmitting}
      />
    </div>
  );
}
