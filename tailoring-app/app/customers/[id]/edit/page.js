"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../lib/useAuth";
import { useToast } from "../../../../components/ToastProvider";
import {
  formatIndianMobile,
  isValidIndianMobile,
  normalizePhoneDigits,
  usePhoneDuplicate,
} from "../../../../lib/phone";

// Owner-only page. ProtectedRoute redirects staff away for a clean UX,
// but the actual write is also blocked by RLS if someone bypasses the UI.
export default function EditCustomerPage() {
  return (
    <ProtectedRoute ownerOnly>
      <EditCustomerForm />
    </ProtectedRoute>
  );
}

function EditCustomerForm() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { duplicate } = usePhoneDuplicate(phone, id);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
      if (!error && data) {
        setFullName(data.full_name || "");
        setPhone(normalizePhoneDigits(data.phone) || "");
        setAddress(data.address || "");
        setNotes(data.notes || "");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isValidIndianMobile(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (duplicate) {
      setError(`This number already belongs to ${duplicate.full_name} — phone numbers must be unique.`);
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        full_name: fullName,
        phone: formatIndianMobile(phone),
        address,
        notes,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    showSuccess("Customer updated.");
    router.push(`/customers/${id}`);
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit customer</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-violet-100 bg-white p-6">
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Phone (Indian mobile)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
              +91
            </span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-11 pr-3 text-base"
            />
          </div>
          {phone && !isValidIndianMobile(phone) && (
            <p className="mt-1 text-sm text-red-600">Enter a valid 10-digit Indian mobile number.</p>
          )}
          {duplicate && (
            <p className="mt-1 text-sm text-amber-700">
              Already used by:{" "}
              <Link href={`/customers/${duplicate.id}`} className="font-medium underline">
                {duplicate.full_name}
                {duplicate.customer_code ? ` (${duplicate.customer_code})` : ""}
              </Link>
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
