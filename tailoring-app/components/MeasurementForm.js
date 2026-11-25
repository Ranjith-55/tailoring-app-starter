"use client";

const CM_PER_INCH = 2.54;

function convertValue(value, fromUnit, toUnit) {
  const num = parseFloat(value);
  if (isNaN(num) || fromUnit === toUnit) return value;
  const cm = fromUnit === "in" ? num * CM_PER_INCH : num;
  const converted = toUnit === "in" ? cm / CM_PER_INCH : cm;
  return Math.round(converted * 10) / 10;
}

// Renders the field grid for whichever garment type is selected. `fields`
// (the list of field names) comes from the owner-editable garment_templates
// table (see lib/useGarmentTemplates.js) rather than being hard-coded here.
// An empty `fields` array (e.g. the seeded "custom" type) falls back to a
// free-form notes textarea.
//
// Each field has its OWN independent unit toggle (in/cm) — e.g. bust can be
// recorded in inches while waist is in cm — stored as a companion
// `${field}_unit` key alongside the numeric value. Switching a field's unit
// converts just that field's number rather than the whole form.
export default function MeasurementForm({ fields = [], values, onChange }) {
  function updateField(field, value) {
    onChange({ ...values, [field]: value });
  }

  function switchFieldUnit(field, newUnit) {
    const currentUnit = values[`${field}_unit`] || "in";
    if (newUnit === currentUnit) return;
    const updated = { ...values, [`${field}_unit`]: newUnit };
    if (values[field] !== undefined && values[field] !== "") {
      updated[field] = convertValue(values[field], currentUnit, newUnit);
    }
    onChange(updated);
  }

  if (fields.length === 0) {
    return (
      <textarea
        rows={5}
        placeholder='Free-form notes, e.g. "length: 40, extra: high neck"'
        value={values.notes || ""}
        onChange={(e) => onChange({ notes: e.target.value })}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-base"
      />
    );
  }

  return (
    // Same grid as the read-only display (grid-cols-2 / sm:grid-cols-3) so
    // cards stay the same width switching between view and edit — the only
    // thing edit mode adds is the input + in/cm toggle inside each one.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fields.map((field) => {
        const unit = values[`${field}_unit`] || "in";
        return (
          <div key={field} className="rounded-xl border border-violet-100 p-2">
            <label className="mb-1.5 block text-sm capitalize text-slate-400">
              {field.replace(/_/g, " ")}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                value={values[field] ?? ""}
                onChange={(e) => updateField(field, e.target.value)}
                className="w-0 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-900"
              />
              <div className="flex shrink-0 rounded-full bg-slate-200/70 p-0.5 text-[11px] leading-none">
                <button
                  type="button"
                  onClick={() => switchFieldUnit(field, "in")}
                  className={`rounded-full px-1 py-0.5 font-semibold transition-colors ${
                    unit === "in" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  in
                </button>
                <button
                  type="button"
                  onClick={() => switchFieldUnit(field, "cm")}
                  className={`rounded-full px-1 py-0.5 font-semibold transition-colors ${
                    unit === "cm" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  cm
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
