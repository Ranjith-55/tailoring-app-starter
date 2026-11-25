"use client";

import { useState } from "react";
import Modal from "./ui/Modal";

// Shown when reopening a delivered order for rework — the only path back
// into production for a delivered order. Always asks for a fresh delivery
// date since the original one no longer applies, plus what the issue was.
export default function ReworkModal({ open, onClose, onConfirm, submitting }) {
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  function reset() {
    setDueDate("");
    setNote("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reopen for rework" maxWidth="max-w-sm">
      <p className="mb-4 text-base text-slate-600">
        This order goes back to <span className="font-medium text-slate-800">Stitching</span>. Set the new
        delivery date to give the customer, and note what the issue was.
      </p>

      <label className="mb-1 block text-base font-medium text-slate-700">What's the issue?</label>
      <textarea
        required
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. sleeve length too short, customer wants it let out"
        className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
      />

      <label className="mb-1 block text-base font-medium text-slate-700">New delivery date</label>
      <input
        type="date"
        required
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="mb-5 w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!dueDate || !note.trim() || submitting}
          onClick={() => {
            onConfirm(dueDate, note.trim());
            reset();
          }}
          className="rounded-xl bg-brand-600 px-4 py-2 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Confirm rework"}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-xl border border-slate-300 px-4 py-2 text-base font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
