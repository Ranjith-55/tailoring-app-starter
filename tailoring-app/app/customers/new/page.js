"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../../components/ProtectedRoute";
import MeasurementForm from "../../../components/MeasurementForm";
import Select from "../../../components/ui/Select";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../lib/useAuth";
import { useGarmentTemplates } from "../../../lib/useGarmentTemplates";
import { useToast } from "../../../components/ToastProvider";
import { formatIndianMobile, isValidIndianMobile, usePhoneDuplicate } from "../../../lib/phone";

export default function NewCustomerPage() {
  return (
    <ProtectedRoute>
      <NewCustomerForm />
    </ProtectedRoute>
  );
}

function NewCustomerForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const { templates, loading: templatesLoading } = useGarmentTemplates();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [garmentType, setGarmentType] = useState("");
  const [measurementValues, setMeasurementValues] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { duplicate } = usePhoneDuplicate(phone);

  useEffect(() => {
    if (!garmentType && templates.length > 0) setGarmentType(templates[0].type_key);
  }, [templates, garmentType]);

  const activeFields = templates.find((t) => t.type_key === garmentType)?.fields || [];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isValidIndianMobile(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (duplicate) {
      setError(`This number already belongs to ${duplicate.full_name} — pick that customer instead of creating a new one.`);
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create the customer row. `created_by` is stamped for the audit trail.
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          full_name: fullName,
          phone: formatIndianMobile(phone),
          address,
          created_by: user.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Create the first measurement set for this customer.
      const { error: measurementError } = await supabase.from("measurements").insert({
        customer_id: customer.id,
        garment_type: garmentType,
        values: measurementValues,
        recorded_by: user.id,
      });
      if (measurementError) throw measurementError;

      // 3. Optional photo upload to private Storage bucket.
      if (photoFile) {
        const filePath = `${customer.id}/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("customer-photos")
          .upload(filePath, photoFile);
        if (uploadError) throw uploadError;

        const { error: photoRowError } = await supabase.from("customer_photos").insert({
          customer_id: customer.id,
          storage_path: filePath,
          uploaded_by: user.id,
        });
        if (photoRowError) throw photoRowError;
      }

      showSuccess("Customer added.");
      router.push(`/customers/${customer.id}`);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Add customer</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-violet-100 bg-white p-6">
        <section>
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Customer details
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
              <label className="mb-1 block text-base font-medium text-slate-700">
                WhatsApp phone (Indian mobile)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
                  +91
                </span>
                <input
                  required
                  placeholder="98765 43210"
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
                  Already a customer:{" "}
                  <Link href={`/customers/${duplicate.id}`} className="font-medium underline">
                    {duplicate.full_name}
                    {duplicate.customer_code ? ` (${duplicate.customer_code})` : ""}
                  </Link>
                </p>
              )}
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-base font-medium text-slate-700">Address (optional)</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Measurements
          </h2>
          <label className="mb-1 block text-base font-medium text-slate-700">Garment type</label>
          <Select
            value={garmentType}
            onChange={(v) => {
              setGarmentType(v);
              setMeasurementValues({});
            }}
            className="mb-4 sm:w-64"
            options={templates.map((t) => ({ value: t.type_key, label: t.label }))}
          />

          {!templatesLoading && (
            <MeasurementForm
              fields={activeFields}
              values={measurementValues}
              onChange={setMeasurementValues}
            />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
            Photo (optional)
          </h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
          <p className="mt-1 text-sm text-slate-400">
            Stored privately — not publicly accessible (see storage policy in
            supabase/schema.sql).
          </p>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {submitting ? "Saving…" : "Save customer"}
        </button>
      </form>
    </div>
  );
}
