"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { slugifyGarmentType, parseGarmentFields } from "../lib/garmentTemplateHelpers";
import { useToast } from "./ToastProvider";

// Owner-only "add a garment type" form, shown inside a Modal from the
// Garment templates page.
export default function AddGarmentTypeForm({ userId, onSaved, onCancel }) {
  const { showSuccess } = useToast();
  const [label, setLabel] = useState("");
  const [fieldsText, setFieldsText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!label.trim()) {
      setError("Enter a name for the garment type.");
      return;
    }
    const typeKey = slugifyGarmentType(label);
    if (!typeKey) {
      setError("That name doesn't produce a valid identifier — try letters or numbers.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("garment_templates").insert({
      type_key: typeKey,
      label: label.trim(),
      fields: parseGarmentFields(fieldsText),
      created_by: userId,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    showSuccess("Garment type added.");
    setLabel("");
    setFieldsText("");
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</div>}

      <div>
        <label className="mb-1 block text-base font-medium text-slate-700">Name</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Kurta"
          autoFocus
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
      </div>
      <div>
        <label className="mb-1 block text-base font-medium text-slate-700">
          Measurement fields (comma-separated, optional)
        </label>
        <input
          value={fieldsText}
          onChange={(e) => setFieldsText(e.target.value)}
          placeholder="chest, length, shoulder"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
        <p className="mt-1 text-sm text-slate-400">Leave blank to make this a free-form notes type.</p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add garment type"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-base text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
