"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import ProtectedRoute from "../../components/ProtectedRoute";
import WhatsAppButton from "../../components/WhatsAppButton";
import ReworkModal from "../../components/ReworkModal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { PackageIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { messageTemplates } from "../../lib/whatsapp";
import { useShopName } from "../../lib/useShopName";
import { useToast } from "../../components/ToastProvider";

const ALL_STATUSES = ["new", "stitching", "ready", "delivered", "cancelled"];
// The board only shows in-progress work — delivered/cancelled orders are
// "done" and would just clutter it; they're still reachable via List view
// or by filtering, and still settable from the status dropdown itself.
const BOARD_COLUMNS = ["new", "stitching", "ready"];

const STATUS_BADGE = {
  new: "bg-slate-100 text-slate-600",
  stitching: "bg-brand-100 text-brand-700",
  ready: "bg-emerald-100 text-emerald-700",
  delivered: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-100 text-red-600",
};

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}

function OrdersContent() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusMenuOrder, setStatusMenuOrder] = useState(null);
  const [statusMenuRect, setStatusMenuRect] = useState(null);
  const [reworkOrder, setReworkOrder] = useState(null);
  const [reworkSubmitting, setReworkSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    // Join customer name/phone and assigned staff name.
    const { data, error } = await supabase
      .from("orders")
      .select("*, customers(full_name, phone), assigned:assigned_to(full_name)")
      .order("created_at", { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  }

  async function updateStatus(order, newStatus) {
    // `is_rework` is a permanent record once set — it stays true across
    // every later status change, so "this order was reworked" stays visible
    // even after it's Ready/Delivered again, not just while it's Stitching.
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);
    if (error) return showError(error.message);

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: newStatus,
      payment_status: order.payment_status,
      changed_by: user.id,
    });

    showSuccess("Order status updated.");
    loadOrders();
  }

  async function handleReworkConfirm(dueDate, note) {
    if (!reworkOrder) return;
    setReworkSubmitting(true);

    const { error } = await supabase
      .from("orders")
      .update({ status: "stitching", due_date: dueDate, is_rework: true, rework_note: note })
      .eq("id", reworkOrder.id);

    if (error) {
      setReworkSubmitting(false);
      showError(error.message);
      return;
    }

    const { error: historyError } = await supabase.from("order_status_history").insert({
      order_id: reworkOrder.id,
      status: "stitching",
      payment_status: reworkOrder.payment_status,
      changed_by: user.id,
      note,
    });
    if (historyError) {
      // `note` column not migrated yet on this database — log the status
      // change anyway, just without the note, rather than losing it entirely.
      await supabase.from("order_status_history").insert({
        order_id: reworkOrder.id,
        status: "stitching",
        payment_status: reworkOrder.payment_status,
        changed_by: user.id,
      });
      showError("Reopened, but the rework note wasn't saved — run the pending database migration (see FEATURES.md).");
    } else {
      showSuccess("Order reopened for rework with a new delivery date.");
    }

    setReworkSubmitting(false);
    setReworkOrder(null);
    loadOrders();
  }

  async function updatePayment(order, newPaymentStatus) {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newPaymentStatus })
      .eq("id", order.id);
    if (error) return showError(error.message);

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: order.status,
      payment_status: newPaymentStatus,
      changed_by: user.id,
    });

    showSuccess("Payment status updated.");
    loadOrders();
  }

  function openStatusMenu(e, order) {
    if (statusMenuOrder?.id === order.id) {
      setStatusMenuOrder(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusMenuRect({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setStatusMenuOrder(order);
  }

  async function markNotified(order) {
    await supabase
      .from("order_status_history")
      .update({ whatsapp_sent: true })
      .eq("order_id", order.id)
      .order("changed_at", { ascending: false })
      .limit(1);
  }

  const sortedOrders = useMemo(() => {
    if (sortBy !== "due_date") return orders;
    return [...orders].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [orders, sortBy]);

  const stats = useMemo(() => {
    const today = todayStr();
    const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
    const dueToday = orders.filter((o) => o.due_date === today).length;
    const overdue = orders.filter(
      (o) => o.due_date && o.due_date < today && !["delivered", "cancelled"].includes(o.status)
    ).length;
    const ready = orders.filter((o) => o.status === "ready").length;
    return { active, dueToday, overdue, ready };
  }, [orders]);

  const listFiltered = useMemo(() => {
    return sortedOrders
      // "All statuses" hides stitching-in-progress orders by default — pick
      // "Stitching" from the filter explicitly to see them here.
      .filter((o) => {
        if (statusFilter === "all") return o.status !== "stitching";
        if (statusFilter === "issue_rework") return o.is_rework;
        return o.status === statusFilter;
      })
      .filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return `${o.order_number || ""} ${o.customers?.full_name || ""} ${o.garment_description || ""}`
          .toLowerCase()
          .includes(q);
      });
  }, [sortedOrders, statusFilter, search]);

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <div>
      <PageHeader
        icon={PackageIcon}
        title="Orders"
        subtitle="Track every garment from measurement to delivery"
        action={{ href: "/orders/new", label: "+ Create order" }}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Due today" value={stats.dueToday} />
        <StatCard label="Overdue" value={stats.overdue} accent="text-red-600" />
        <StatCard label="Ready" value={stats.ready} accent="text-emerald-600" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-slate-300 p-0.5 text-base">
          <button
            onClick={() => setView("board")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              view === "board" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              view === "list" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            List
          </button>
        </div>

        {view === "list" && (
          <>
            <input
              type="text"
              placeholder="Search order #, customer, garment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                ...ALL_STATUSES,
                { value: "issue_rework", label: "Issue / Rework" },
              ]}
              className="w-44"
            />
          </>
        )}

        <div className="ml-auto">
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "newest", label: "Sort: Newest first" },
              { value: "due_date", label: "Sort: Due date" },
            ]}
            className="w-48"
          />
        </div>
      </div>

      {view === "board" ? (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
          {BOARD_COLUMNS.map((status) => (
            <div key={status} className="rounded-2xl bg-slate-100 p-3">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {status.replace("_", " ")} ({sortedOrders.filter((o) => o.status === status).length})
              </h2>
              {/* Phone/tablet: cards scroll horizontally within each status
                  "row". Desktop (lg+): status is a column, cards stack
                  vertically — iPad-width screens stay in the row layout. */}
              <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {sortedOrders
                  .filter((o) => o.status === status)
                  // Rework redos surface first within Stitching — they're a
                  // second attempt on something already promised once.
                  .sort((a, b) => (b.is_rework ? 1 : 0) - (a.is_rework ? 1 : 0))
                  .map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      className="w-64 shrink-0 lg:w-full"
                      onStatusChange={(s) => updateStatus(order, s)}
                      onPaymentChange={(p) => updatePayment(order, p)}
                      onNotified={() => markNotified(order)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="scrollbar-thin overflow-x-auto rounded-3xl border border-violet-100 bg-white">
          <table className="w-full text-left text-base">
            <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Garment</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {listFiltered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-base text-slate-400">
                    No orders match.
                  </td>
                </tr>
              )}
              {listFiltered.map((o) => {
                const isOverdue =
                  o.due_date && o.due_date < todayStr() && !["delivered", "cancelled"].includes(o.status);
                const balance = (o.total_amount || 0) - (o.amount_paid || 0);
                return (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/orders/${o.id}`} className="text-brand-700 hover:underline">
                        {o.order_number || o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.customers?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{o.garment_description}</td>
                    <td className="px-4 py-3 text-slate-500">{o.assigned?.full_name || "Unassigned"}</td>
                    <td className={`px-4 py-3 ${isOverdue ? "font-medium text-red-600" : "text-slate-500"}`}>
                      {o.due_date ? new Date(o.due_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${STATUS_BADGE[o.status] || ""}`}>
                          {isOverdue ? "overdue" : o.status}
                        </span>
                        {o.is_rework && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-700">
                            Issue / Rework
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {balance > 0 ? `₹${balance}` : <span className="text-emerald-600">Paid</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => openStatusMenu(e, o)}
                        aria-label="Change status"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {statusMenuOrder &&
        statusMenuRect &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setStatusMenuOrder(null)} />
            <div
              style={{ top: statusMenuRect.top, right: statusMenuRect.right }}
              className="fixed z-[70] w-44 overflow-hidden rounded-xl border border-violet-100 bg-white py-1 shadow-popover"
            >
              <p className="px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Set status
              </p>
              {statusMenuOrder.status === "delivered" ? (
                <button
                  type="button"
                  onClick={() => {
                    setReworkOrder(statusMenuOrder);
                    setStatusMenuOrder(null);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-base font-medium text-amber-700 hover:bg-amber-50"
                >
                  Issue / Rework
                </button>
              ) : (
                ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      updateStatus(statusMenuOrder, s);
                      setStatusMenuOrder(null);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-base capitalize hover:bg-slate-50 ${
                      statusMenuOrder.status === s ? "font-semibold text-brand-700" : "text-slate-700"
                    }`}
                  >
                    {s}
                  </button>
                ))
              )}
            </div>
          </>,
          document.body
        )}

      <ReworkModal
        open={!!reworkOrder}
        onClose={() => setReworkOrder(null)}
        onConfirm={handleReworkConfirm}
        submitting={reworkSubmitting}
      />
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-4">
      <p className={`text-3xl font-black ${accent || "text-ink"}`}>{value}</p>
      <p className="text-base text-slate-500">{label}</p>
    </div>
  );
}

function OrderCard({ order, onStatusChange, onPaymentChange, onNotified, className = "" }) {
  const shopName = useShopName();
  const customerName = order.customers?.full_name || "Customer";
  const customerPhone = order.customers?.phone;
  const balance = (order.total_amount || 0) - (order.amount_paid || 0);
  const isOverdue =
    order.due_date &&
    new Date(order.due_date) < new Date(new Date().toDateString()) &&
    !["delivered", "cancelled"].includes(order.status);

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
    <div
      className={`rounded-xl border bg-white p-3 shadow-sm ${
        order.is_rework ? "border-amber-300" : "border-violet-100"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/orders/${order.id}`} className="font-medium text-slate-900 hover:text-brand-700">
          {customerName}
        </Link>
        {order.order_number && (
          <span className="whitespace-nowrap text-sm text-slate-400">{order.order_number}</span>
        )}
      </div>
      {order.is_rework && (
        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700">
          Issue / Rework
        </span>
      )}
      <p className="mt-1 text-base text-slate-500">{order.garment_description}</p>
      <p className="mt-1 text-base text-slate-700">
        ₹{order.amount_paid || 0} / ₹{order.total_amount || 0}
        {balance > 0 && <span className="text-red-500"> (₹{balance} due)</span>}
      </p>

      {order.due_date && (
        <p className={`mt-1 text-sm ${isOverdue ? "font-medium text-red-600" : "text-slate-400"}`}>
          {isOverdue ? "Overdue — " : "Due "}
          {new Date(order.due_date).toLocaleDateString()}
        </p>
      )}

      <p className="mt-1 text-sm text-slate-400">
        Assigned: {order.assigned?.full_name || "Unassigned"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={order.status} onChange={onStatusChange} options={ALL_STATUSES} />
        <Select value={order.payment_status} onChange={onPaymentChange} options={["pending", "partial", "paid"]} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {customerPhone && <WhatsAppButton phone={customerPhone} message={message} onSent={onNotified} />}
        <Link href={`/payments?order=${order.id}`} className="text-sm font-medium text-brand-600 hover:underline">
          + Payment
        </Link>
      </div>
    </div>
  );
}
