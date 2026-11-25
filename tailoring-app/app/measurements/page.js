"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import CustomerPicker from "../../components/CustomerPicker";
import AddMeasurementForm from "../../components/AddMeasurementForm";
import MeasurementForm from "../../components/MeasurementForm";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { RulerIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { useGarmentTemplates } from "../../lib/useGarmentTemplates";
import { useToast } from "../../components/ToastProvider";
import { formatMeasurementSummary } from "../../lib/formatMeasurement";

export default function MeasurementsPage() {
  return (
    <ProtectedRoute>
      <MeasurementsContent />
    </ProtectedRoute>
  );
}

function MeasurementsContent() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { templates: garmentTemplates } = useGarmentTemplates();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [activeGarment, setActiveGarment] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [adding, setAdding] = useState(false);
  const [recent, setRecent] = useState([]);
  const [editingCurrent, setEditingCurrent] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [lockedByOrder, setLockedByOrder] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { run: fn } | null

  useEffect(() => {
    async function loadCustomers() {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, phone, customer_code")
        .order("full_name");
      setCustomers(data || []);
    }
    loadCustomers();
    loadRecent();
  }, []);

  async function loadRecent() {
    const { data } = await supabase
      .from("measurements")
      .select("id, garment_type, recorded_at, version_label, customers(id, full_name, phone, customer_code)")
      .order("recorded_at", { ascending: false })
      .limit(15);
    setRecent(data || []);
  }

  useEffect(() => {
    if (!selectedCustomer) {
      setMeasurements([]);
      setActiveGarment(null);
      return;
    }
    loadMeasurements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  function handleMeasurementSaved(customer) {
    loadRecent();
    if (customer) {
      setCustomers((prev) =>
        prev.some((c) => c.id === customer.id)
          ? prev
          : [...prev, customer].sort((a, b) => a.full_name.localeCompare(b.full_name))
      );
      setSelectedCustomer(customer);
    } else {
      loadMeasurements();
    }
  }

  async function loadMeasurements() {
    const { data } = await supabase
      .from("measurements")
      .select("*")
      .eq("customer_id", selectedCustomer.id)
      .order("recorded_at", { ascending: false });
    const rows = data || [];
    setMeasurements(rows);
    setActiveGarment((prev) => (prev && rows.some((m) => m.garment_type === prev) ? prev : rows[0]?.garment_type ?? null));
    setShowHistory(false);
    setAdding(false);
    setEditingCurrent(false);
  }

  function startEditCurrent(current) {
    setEditValues(current.values || {});
    setEditingCurrent(true);
  }

  async function handleSaveEdit(current) {
    setSavingEdit(true);
    const { error } = await supabase.from("measurements").update({ values: editValues }).eq("id", current.id);
    setSavingEdit(false);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Measurement updated.");
    setEditingCurrent(false);
    loadMeasurements();
  }

  const garmentTypes = useMemo(() => {
    const seen = new Set();
    const order = [];
    measurements.forEach((m) => {
      if (!seen.has(m.garment_type)) {
        seen.add(m.garment_type);
        order.push(m.garment_type);
      }
    });
    return order;
  }, [measurements]);

  const garmentRows = measurements.filter((m) => m.garment_type === activeGarment);
  const current = garmentRows[0];
  const history = garmentRows.slice(1);
  const isDirty = editingCurrent && JSON.stringify(editValues) !== JSON.stringify(current?.values || {});

  // Anything that navigates away from the current garment/customer goes
  // through this — if there are unsaved edits, it pauses for a decision
  // instead of silently dropping them.
  function guardedAction(action) {
    if (isDirty) {
      setPendingAction({ run: action });
      return;
    }
    if (editingCurrent) setEditingCurrent(false);
    action();
  }

  useEffect(() => {
    if (!current?.id) {
      setLockedByOrder(false);
      return;
    }
    let cancelled = false;
    async function checkLock() {
      // Once an order using this measurement has moved past "new" (i.e.
      // stitching has actually started against these numbers), editing them
      // in place would silently change what's already being cut/sewn — so
      // it locks. A brand-new, not-yet-started order doesn't block it.
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("measurement_id", current.id)
        .neq("status", "new");
      if (!cancelled) setLockedByOrder((count || 0) > 0);
    }
    checkLock();
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  return (
    <div>
      <PageHeader
        icon={RulerIcon}
        title="Measurements"
        subtitle="Versioned garment measurements — old orders never change"
      >
        <button
          onClick={() => guardedAction(() => setAdding(true))}
          className="whitespace-nowrap rounded-2xl bg-brand-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700"
        >
          + Add new measurement
        </button>
      </PageHeader>

      <div className="mb-6 max-w-lg">
        <CustomerPicker
          customers={customers}
          value={selectedCustomer}
          onChange={(c) => guardedAction(() => setSelectedCustomer(c))}
        />
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add measurement" maxWidth="max-w-5xl">
        <AddMeasurementForm
          customerId={selectedCustomer?.id}
          customers={customers}
          userId={user?.id}
          onSaved={handleMeasurementSaved}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      {!selectedCustomer && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Recently added</h2>
          {recent.length === 0 ? (
            <p className="text-base text-slate-400">No measurements recorded yet.</p>
          ) : (
            <div className="divide-y divide-violet-100 overflow-hidden rounded-3xl border border-violet-100 bg-white">
              {recent.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => m.customers && guardedAction(() => setSelectedCustomer(m.customers))}
                  className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-left hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{m.customers?.full_name ?? "Unknown customer"}</p>
                    <p className="text-sm text-slate-400">
                      {m.customers?.phone}
                      {m.customers?.customer_code ? ` · ${m.customers.customer_code}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium capitalize text-slate-700">{m.garment_type.replace(/_/g, " ")}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(m.recorded_at).toLocaleDateString()}
                      {m.version_label ? ` · ${m.version_label}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedCustomer && (
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          <div className="space-y-1">
            {garmentTypes.map((g) => (
              <button
                key={g}
                onClick={() =>
                  guardedAction(() => {
                    setActiveGarment(g);
                    setShowHistory(false);
                    setAdding(false);
                  })
                }
                className={`block w-full rounded-xl px-3 py-2 text-left text-base font-medium capitalize ${
                  activeGarment === g ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {g.replace(/_/g, " ")}
                <span className="ml-1 text-sm text-slate-400">
                  ({measurements.filter((m) => m.garment_type === g).length})
                </span>
              </button>
            ))}
            <button
              onClick={() => guardedAction(() => setAdding(true))}
              className="mt-2 block w-full rounded-xl px-3 py-2 text-left text-base font-medium text-brand-600 hover:bg-brand-50"
            >
              + New garment type
            </button>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-6">
            {activeGarment && current && (
              <>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium capitalize text-slate-900">
                      {activeGarment.replace(/_/g, " ")} — {selectedCustomer.full_name}
                    </h2>
                    <p className="truncate text-sm text-slate-400">
                      {new Date(current.recorded_at).toLocaleDateString()}
                      {current.version_label ? ` · ${current.version_label}` : ""} · Current
                    </p>
                  </div>

                    <div className="flex shrink-0 items-center gap-2">
                    {editingCurrent ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(current)}
                        disabled={savingEdit || !isDirty}
                        title={!isDirty ? "Change a value first" : undefined}
                        className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                      >
                        {savingEdit ? "Saving…" : "Update changes"}
                      </button>
                      <button
                        onClick={() => setEditingCurrent(false)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Discard changes
                      </button>
                    </>
                  ) : lockedByOrder ? (
                    <span
                      className="text-sm font-medium text-slate-400"
                      title="An order using this measurement has already started stitching, so it's locked from edits."
                    >
                      🔒 Locked — in production
                    </span>
                  ) : (
                    <button
                      onClick={() => startEditCurrent(current)}
                      className="text-base font-medium text-brand-600 hover:underline"
                    >
                      Update
                    </button>
                  )}
                  </div>
                </div>

                {editingCurrent ? (
                  <MeasurementForm
                    fields={Object.keys(current.values || {}).filter((k) => !k.endsWith("_unit") && k !== "notes")}
                    values={editValues}
                    onChange={setEditValues}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.keys(current.values || {})
                      .filter((k) => !k.endsWith("_unit") && k !== "notes")
                      .map((k) => (
                        <div key={k} className="rounded-xl border border-violet-100 p-2">
                          <p className="text-sm capitalize text-slate-400">{k.replace(/_/g, " ")}</p>
                          <p className="font-medium text-slate-900">
                            {current.values[k]}
                            <span className="ml-0.5 text-sm font-normal text-slate-400">
                              {current.values[`${k}_unit`] || current.values._unit || "in"}
                            </span>
                          </p>
                        </div>
                      ))}
                    {Object.keys(current.values || {}).filter((k) => !k.endsWith("_unit") && k !== "notes")
                      .length === 0 && <p className="text-base text-slate-400">No fields recorded.</p>}
                  </div>
                )}

                {history.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowHistory((s) => !s)}
                      className="text-base font-medium text-slate-500 hover:underline"
                    >
                      {showHistory ? "Hide history" : `View history (${history.length})`}
                    </button>
                    {showHistory && (
                      <div className="mt-3 space-y-2">
                        {history.map((m) => (
                          <div key={m.id} className="rounded-xl border border-violet-100 p-3 text-base">
                            <p className="mb-1 text-sm text-slate-400">
                              {new Date(m.recorded_at).toLocaleDateString()}
                              {m.version_label ? ` · ${m.version_label}` : ""}
                            </p>
                            <p className="text-slate-600">{formatMeasurementSummary(m.values)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!activeGarment && (
              <p className="text-base text-slate-400">
                No measurements yet for this customer — add one to get started.
              </p>
            )}
          </div>
        </div>
      )}

      <Modal open={!!pendingAction} onClose={() => setPendingAction(null)} title="Unsaved changes" maxWidth="max-w-sm">
        <p className="mb-4 text-base text-slate-600">
          You've changed values for this measurement without saving. Update the changes before leaving, or discard
          them?
        </p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await handleSaveEdit(current);
              pendingAction.run();
              setPendingAction(null);
            }}
            disabled={savingEdit}
            className="rounded-xl bg-brand-600 px-4 py-2 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
          >
            {savingEdit ? "Saving…" : "Update changes"}
          </button>
          <button
            onClick={() => {
              setEditingCurrent(false);
              pendingAction.run();
              setPendingAction(null);
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 text-base font-medium text-slate-600 hover:bg-slate-50"
          >
            Discard changes
          </button>
        </div>
      </Modal>
    </div>
  );
}
