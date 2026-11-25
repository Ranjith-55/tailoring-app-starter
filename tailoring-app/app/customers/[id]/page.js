"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserRound, Ruler, Image as ImageIcon, ClipboardList } from "lucide-react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import AddMeasurementForm from "../../../components/AddMeasurementForm";
import WhatsAppButton from "../../../components/WhatsAppButton";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../lib/useAuth";
import { useToast } from "../../../components/ToastProvider";
import { formatMeasurementSummary } from "../../../lib/formatMeasurement";
import { messageTemplates } from "../../../lib/whatsapp";
import { useShopName } from "../../../lib/useShopName";

const STATUS_BADGE = {
  new: "bg-slate-100 text-slate-600",
  stitching: "bg-brand-100 text-brand-700",
  ready: "bg-emerald-100 text-emerald-700",
  delivered: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-100 text-red-600",
};

export default function CustomerDetailPage() {
  return (
    <ProtectedRoute>
      <CustomerDetailContent />
    </ProtectedRoute>
  );
}

function CustomerDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const { showSuccess, showError } = useToast();
  const shopName = useShopName();

  const [customer, setCustomer] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [photos, setPhotos] = useState([]); // [{ id, caption, signedUrl }]
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addingMeasurement, setAddingMeasurement] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    setLoading(true);

    const [{ data: customerData }, { data: measurementData }, { data: photoData }, { data: orderData }] =
      await Promise.all([
        supabase.from("customers").select("*").eq("id", id).single(),
        supabase
          .from("measurements")
          .select("*")
          .eq("customer_id", id)
          .order("recorded_at", { ascending: false }),
        supabase
          .from("customer_photos")
          .select("*")
          .eq("customer_id", id)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
      ]);

    setCustomer(customerData || null);
    setMeasurements(measurementData || []);
    setOrders(orderData || []);

    // Photos are in a private bucket, so generate a short-lived signed URL per photo.
    if (photoData?.length) {
      const withUrls = await Promise.all(
        photoData.map(async (p) => {
          const { data } = await supabase.storage
            .from("customer-photos")
            .createSignedUrl(p.storage_path, 60 * 60); // 1 hour
          return { ...p, signedUrl: data?.signedUrl };
        })
      );
      setPhotos(withUrls);
    } else {
      setPhotos([]);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${customer.full_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess(`Deleted ${customer.full_name}.`);
    router.push("/customers");
  }

  async function handleMeasurementSaved() {
    setAddingMeasurement(false);
    const { data: measurementData } = await supabase
      .from("measurements")
      .select("*")
      .eq("customer_id", id)
      .order("recorded_at", { ascending: false });
    setMeasurements(measurementData || []);
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;
  if (!customer) return <p className="text-base text-slate-400">Customer not found.</p>;

  const totalBilled = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + Number(o.amount_paid || 0), 0);
  const totalDue = totalBilled - totalPaid;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <UserRound size={28} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-ink">{customer.full_name}</h1>
              {customer.customer_code && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-500">
                  {customer.customer_code}
                </span>
              )}
            </div>
            <p className="text-base text-slate-500">{customer.phone}</p>
            {customer.address && <p className="text-base text-slate-400">{customer.address}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {customer.phone && (
            <WhatsAppButton
              phone={customer.phone}
              message={messageTemplates.welcome({ name: customer.full_name, shopName })}
              label="Send welcome message"
            />
          )}
          {/* Edit/Delete only rendered for owner — and only actually work for
              owner, because Row-Level Security enforces it server-side too. */}
          {isOwner && (
            <>
              <a
                href={`/customers/${id}/edit`}
                className="rounded-xl border border-slate-300 px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit
              </a>
              <button
                onClick={handleDelete}
                className="rounded-xl border border-red-300 px-4 py-2 text-base font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {customer.notes && (
        <div className="mb-6 rounded-2xl border border-violet-100 bg-brand-50/40 p-4 text-base text-slate-600">
          {customer.notes}
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-3xl border border-violet-100 bg-white p-5">
          <p className="text-sm text-slate-500">Total billed</p>
          <p className="mt-1 text-2xl font-black text-ink">₹{totalBilled}</p>
        </div>
        <div className="rounded-3xl border border-violet-100 bg-white p-5">
          <p className="text-sm text-slate-500">Total paid</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">₹{totalPaid}</p>
        </div>
        <div className="rounded-3xl border border-violet-100 bg-white p-5">
          <p className="text-sm text-slate-500">Balance due</p>
          <p className={`mt-1 text-2xl font-black ${totalDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
            ₹{totalDue}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Ruler size={16} /> Measurement history
            </h2>
            {!addingMeasurement && (
              <button
                onClick={() => setAddingMeasurement(true)}
                className="text-base font-medium text-brand-600 hover:underline"
              >
                + Add measurement
              </button>
            )}
          </div>

          {addingMeasurement && (
            <div className="mb-4">
              <AddMeasurementForm
                customerId={id}
                userId={user.id}
                onSaved={handleMeasurementSaved}
                onCancel={() => setAddingMeasurement(false)}
              />
            </div>
          )}

          {measurements.length === 0 && (
            <p className="text-base text-slate-400">No measurements recorded yet.</p>
          )}
          <div className="space-y-3">
            {measurements.map((m) => (
              <div key={m.id} className="rounded-xl border border-violet-100 p-3 text-base">
                <p className="mb-1 font-medium capitalize text-slate-900">
                  {m.garment_type.replace(/_/g, " ")}
                </p>
                <p className="text-slate-500">{formatMeasurementSummary(m.values)}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {new Date(m.recorded_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <ImageIcon size={16} /> Photos
          </h2>
          {photos.length === 0 && (
            <p className="text-base text-slate-400">No photos uploaded yet.</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <a
                key={p.id}
                href={p.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-violet-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.signedUrl} alt={p.caption || "customer photo"} className="h-24 w-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <ClipboardList size={16} /> Orders
          </h2>
          <div className="flex items-center gap-4">
            <Link href={`/orders/new?customer=${id}`} className="text-base font-medium text-brand-600 hover:underline">
              + New order
            </Link>
            <Link href="/orders" className="text-base font-medium text-brand-600 hover:underline">
              Manage on orders board →
            </Link>
          </div>
        </div>
        {orders.length === 0 && <p className="text-base text-slate-400">No orders yet.</p>}
        <div className="space-y-2">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 p-3 text-base hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">
                {o.order_number || o.garment_description}
              </span>
              <span className="text-slate-500">{o.garment_description}</span>
              <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${STATUS_BADGE[o.status] || ""}`}>
                {o.status}
              </span>
              <span className="text-slate-500">
                ₹{o.amount_paid} / ₹{o.total_amount}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
