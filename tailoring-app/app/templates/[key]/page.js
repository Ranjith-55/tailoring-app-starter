"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { supabase } from "../../../lib/supabaseClient";
import { useToast } from "../../../components/ToastProvider";

function parseFields(text) {
  return text
    .split(",")
    .map((f) => f.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

export default function TemplateDetailPage() {
  return (
    <ProtectedRoute ownerOnly>
      <TemplateDetailContent />
    </ProtectedRoute>
  );
}

function TemplateDetailContent() {
  const { key } = useParams();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [template, setTemplate] = useState(null);
  const [label, setLabel] = useState("");
  const [fieldsText, setFieldsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("garment_templates").select("*").eq("type_key", key).single();
    setTemplate(data || null);
    setLabel(data?.label || "");
    setFieldsText((data?.fields || []).join(", "));
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("garment_templates")
      .update({ label, fields: parseFields(fieldsText) })
      .eq("type_key", key);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
    load();
  }

  async function handleDelete() {
    const [{ count: measurementCount }, { count: orderItemCount }] = await Promise.all([
      supabase.from("measurements").select("id", { count: "exact", head: true }).eq("garment_type", key),
      supabase.from("order_items").select("id", { count: "exact", head: true }).eq("garment_type", key),
    ]);
    const inUse = (measurementCount || 0) > 0 || (orderItemCount || 0) > 0;

    if (inUse) {
      if (
        !confirm(
          `"${template.label}" is used by existing measurements/orders, so it can't be deleted without losing that history. Hide it from new selections instead? Existing records keep their data unchanged.`
        )
      )
        return;

      const { data: updatedRows, error: hideError } = await supabase
        .from("garment_templates")
        .update({ is_active: false })
        .eq("type_key", key)
        .select();

      if (hideError) {
        showError(hideError.message);
        return;
      }
      if (!updatedRows || updatedRows.length === 0) {
        showError("That didn't go through — you may not have owner permissions for this.");
        return;
      }
      showSuccess(`"${template.label}" is now hidden from new selections.`);
      router.push("/templates");
      return;
    }

    if (!confirm(`Delete "${template.label}"? It has no measurements or orders using it, so this can't be undone.`))
      return;

    const { data: deletedRows, error: deleteError } = await supabase
      .from("garment_templates")
      .delete()
      .eq("type_key", key)
      .select();

    if (deleteError) {
      showError(deleteError.message);
      return;
    }
    if (!deletedRows || deletedRows.length === 0) {
      showError("Delete didn't go through — you may not have owner permissions for this, or it was already removed.");
      return;
    }
    showSuccess(`Deleted "${template.label}".`);
    router.push("/templates");
  }

  async function handleRestore() {
    const { data: updatedRows, error: restoreError } = await supabase
      .from("garment_templates")
      .update({ is_active: true })
      .eq("type_key", key)
      .select();

    if (restoreError) {
      showError(restoreError.message);
      return;
    }
    if (!updatedRows || updatedRows.length === 0) {
      showError("That didn't go through — you may not have owner permissions for this.");
      return;
    }
    showSuccess(`"${template.label}" is visible for new selections again.`);
    load();
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;
  if (!template) return <p className="text-base text-slate-400">Garment type not found.</p>;

  const fieldPreview = parseFields(fieldsText);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/templates" className="mb-4 inline-block text-base font-medium text-brand-600 hover:underline">
        ← All garment templates
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">{template.label}</h1>
          <p className="text-base text-slate-400">key: {template.type_key}</p>
          {template.is_active === false && (
            <p className="mt-1 text-sm font-medium text-amber-600">
              Hidden — not offered for new measurements/orders. Existing records are unaffected.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {template.is_active === false && (
            <button
              onClick={handleRestore}
              className="rounded-xl border border-emerald-300 px-4 py-2 text-base font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Restore
            </button>
          )}
          <button
            onClick={handleDelete}
            className="rounded-xl border border-red-300 px-4 py-2 text-base font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</div>
      )}
      {saved && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-base text-emerald-700">Saved.</div>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-3xl border border-violet-100 bg-white p-6">
        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">Display name</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium text-slate-700">
            Measurement fields (comma-separated; leave blank for a free-form notes field)
          </label>
          <input
            value={fieldsText}
            onChange={(e) => setFieldsText(e.target.value)}
            placeholder="bust, waist, shoulder"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>

        {fieldPreview.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
              Preview — what staff will see (they can toggle in / cm when entering)
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fieldPreview.map((f) => (
                <div key={f} className="rounded-xl border border-violet-100 p-2">
                  <p className="text-sm capitalize text-slate-400">{f.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
