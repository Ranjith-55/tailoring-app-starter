"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { supabase } from "../../../lib/supabaseClient";
import { useToast } from "../../../components/ToastProvider";

export default function NewStaffPage() {
  return (
    <ProtectedRoute ownerOnly>
      <NewStaffForm />
    </ProtectedRoute>
  );
}

function NewStaffForm() {
  const router = useRouter();
  const { showSuccess } = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", job_role: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // This calls the optional Edge Function in supabase/functions/create-staff.
    // It uses the service role key SERVER-SIDE ONLY to create the auth user,
    // then inserts the matching `staff` row with role = 'staff'.
    // If you haven't deployed that function yet, see the README for the
    // manual alternative (create the user in the Supabase dashboard, then
    // add their `staff` row here with the same id).
    const { error: fnError } = await supabase.functions.invoke("create-staff", {
      body: form,
    });

    setSubmitting(false);

    if (fnError) {
      setError(
        `${fnError.message}. If you haven't deployed the create-staff Edge Function yet, ` +
          `see README.md for the manual way to add a staff account.`
      );
      return;
    }

    showSuccess("Staff account created.");
    router.push("/staff");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Add new staff</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl border border-violet-100 bg-white p-6">
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Full name</label>
          <input
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Phone (optional)</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">
            Job role, e.g. Tailor (optional)
          </label>
          <input
            value={form.job_role}
            onChange={(e) => setForm({ ...form, job_role: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Temporary password</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {submitting ? "Creating…" : "Create staff account"}
        </button>
      </form>
    </div>
  );
}
