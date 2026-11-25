"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import MeasurementForm from "./MeasurementForm";
import CustomerPicker from "./CustomerPicker";
import { supabase } from "../lib/supabaseClient";
import { useGarmentTemplates } from "../lib/useGarmentTemplates";
import { useToast } from "./ToastProvider";

// Shared "record a new measurement version" form — used on the customer
// detail page and the standalone Measurements page. Garment types + their
// fields come from the owner-editable garment_templates table.
//
// `customerId` is optional: when the caller already knows which customer
// this is for (e.g. the customer detail page), pass it and the form just
// records a measurement. When it's omitted (e.g. the Measurements page
// before any customer is picked), the form shows its own customer field —
// pick an existing customer or create a new one inline — and reports the
// resolved customer back via `onSaved` so the caller can adopt it.
//
// More than one garment type can be checked at once — each gets its own
// field section below the chip row, and Save writes one measurement row
// per checked garment in a single batch insert.
export default function AddMeasurementForm({
  customerId,
  customers,
  userId,
  defaultGarmentType,
  onSaved,
  onCancel,
}) {
  const { templates, loading: templatesLoading } = useGarmentTemplates();
  const { showSuccess, showError } = useToast();
  const [selectedTypes, setSelectedTypes] = useState(defaultGarmentType ? [defaultGarmentType] : []);
  const [valuesByType, setValuesByType] = useState({});
  const [pickedCustomer, setPickedCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typePickerRect, setTypePickerRect] = useState(null);
  const typeTriggerRef = useRef(null);

  const effectiveCustomerId = customerId || pickedCustomer?.id;

  function toggleType(typeKey) {
    setSelectedTypes((prev) =>
      prev.includes(typeKey) ? prev.filter((t) => t !== typeKey) : [...prev, typeKey]
    );
  }

  function openTypePicker() {
    const rect = typeTriggerRef.current?.getBoundingClientRect();
    if (rect) setTypePickerRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setTypePickerOpen((o) => !o);
  }

  // The trigger lives inside the modal's scrollable body, so the dropdown
  // is rendered through a portal (below) positioned from the trigger's
  // real screen coordinates — otherwise the body's own overflow clips it.
  // Scrolling/resizing would make those coordinates stale, so just close
  // instead of tracking them live.
  useEffect(() => {
    if (!typePickerOpen) return;
    function close() {
      setTypePickerOpen(false);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [typePickerOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!effectiveCustomerId || selectedTypes.length === 0) return;
    setSaving(true);

    const rows = selectedTypes.map((typeKey) => ({
      customer_id: effectiveCustomerId,
      garment_type: typeKey,
      values: valuesByType[typeKey] || {},
      recorded_by: userId,
    }));
    const { error } = await supabase.from("measurements").insert(rows);

    setSaving(false);

    if (error) {
      showError(error.message);
      return;
    }

    showSuccess(rows.length > 1 ? "Measurements saved." : "Measurement saved.");
    setSelectedTypes([]);
    setValuesByType({});
    onSaved?.(pickedCustomer);
  }

  if (templatesLoading) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!customerId && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Customer</label>
          <CustomerPicker
            customers={customers || []}
            value={pickedCustomer}
            onChange={setPickedCustomer}
            allowCreate
            userId={userId}
          />
          {!pickedCustomer && (
            <p className="mt-1 text-sm text-slate-400">
              Pick an existing customer or create a new one to continue.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">
          Garment type{selectedTypes.length > 1 ? "s" : ""}
        </label>
        <div className="sm:w-80">
          <button
            ref={typeTriggerRef}
            type="button"
            onClick={openTypePicker}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 px-3 py-2 text-left text-base"
          >
            <span className={selectedTypes.length ? "text-slate-900" : "text-slate-400"}>
              {selectedTypes.length === 0
                ? "Select garment types…"
                : selectedTypes
                    .map((tk) => templates.find((t) => t.type_key === tk)?.label || tk)
                    .join(", ")}
            </span>
            <ChevronDown
              size={18}
              className={`shrink-0 text-slate-400 transition-transform ${typePickerOpen ? "rotate-180" : ""}`}
            />
          </button>

          {typePickerOpen &&
            typePickerRect &&
            createPortal(
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setTypePickerOpen(false)} />
                <div
                  style={{ top: typePickerRect.top, left: typePickerRect.left, width: typePickerRect.width }}
                  className="fixed z-[70] max-h-72 overflow-y-auto rounded-xl border border-violet-100 bg-white py-1 shadow-popover"
                >
                  {templates.map((t) => (
                    <button
                      key={t.type_key}
                      type="button"
                      onClick={() => toggleType(t.type_key)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-base capitalize hover:bg-slate-50"
                    >
                      {t.label}
                      {selectedTypes.includes(t.type_key) && (
                        <Check size={16} className="shrink-0 text-brand-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>,
              document.body
            )}
        </div>
      </div>

      {selectedTypes.length === 0 && (
        <p className="text-base text-slate-400">Pick at least one garment type to continue.</p>
      )}

      {selectedTypes.map((typeKey) => {
        const template = templates.find((t) => t.type_key === typeKey);
        return (
          <div key={typeKey} className="rounded-3xl border border-violet-100 bg-white p-6">
            <p className="mb-3 font-medium capitalize text-slate-900">{template?.label || typeKey}</p>
            <MeasurementForm
              fields={template?.fields || []}
              values={valuesByType[typeKey] || {}}
              onChange={(v) => setValuesByType((prev) => ({ ...prev, [typeKey]: v }))}
            />
          </div>
        );
      })}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !effectiveCustomerId || selectedTypes.length === 0}
          className="rounded-xl bg-brand-600 px-3 py-1.5 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save measurement${selectedTypes.length > 1 ? "s" : ""}`}
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
