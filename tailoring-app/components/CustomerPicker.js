"use client";

import { useMemo, useRef, useState } from "react";
import { Search, ChevronDown, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { formatIndianMobile, isValidIndianMobile, usePhoneDuplicate } from "../lib/phone";

// Reusable search-and-pick UI for customers, shared by the new-order,
// payments, and measurements pages. `customers` is the full list already
// fetched by the caller; `value`/`onChange` behave like a controlled
// selected-customer field. Behaves like a real dropdown: the match list
// only appears while the input is focused, and closes on blur/selection
// instead of always sitting open on the page.
//
// When `allowCreate` is set, an inline "create new customer" option shows
// under the results so a brand-new customer can be added without leaving
// the current flow — the created row is passed to `onChange` just like an
// existing customer would be. `userId` is stamped as `created_by`.
export default function CustomerPicker({
  customers,
  value,
  onChange,
  placeholder = "Search by name, phone, or customer code…",
  allowCreate = false,
  userId,
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [createError, setCreateError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const blurTimeout = useRef(null);
  const { duplicate: newPhoneDuplicate } = usePhoneDuplicate(newPhone);

  const filtered = useMemo(() => {
    if (!search) return customers.slice(0, 8);
    const q = search.toLowerCase();
    return customers
      .filter((c) => `${c.full_name} ${c.phone} ${c.customer_code || ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, search]);

  function handleSelect(c) {
    clearTimeout(blurTimeout.current);
    setOpen(false);
    setSearch("");
    onChange(c);
  }

  function handleBlur() {
    // Delay so a click on a dropdown row registers before the list unmounts.
    blurTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  function startCreate() {
    clearTimeout(blurTimeout.current);
    setNewName(search);
    setNewPhone("");
    setCreateError("");
    setCreating(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      setCreateError("Name and phone are required.");
      return;
    }
    if (!isValidIndianMobile(newPhone)) {
      setCreateError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (newPhoneDuplicate) {
      setCreateError("This number already belongs to an existing customer — select them above instead.");
      return;
    }
    setCreateError("");
    setSubmitting(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({ full_name: newName.trim(), phone: formatIndianMobile(newPhone), created_by: userId })
      .select()
      .single();
    setSubmitting(false);

    if (error) {
      setCreateError(error.message);
      return;
    }

    setCreating(false);
    setOpen(false);
    setSearch("");
    onChange(data);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-slate-50 px-3 py-2">
        <div>
          <p className="font-medium text-slate-900">{value.full_name}</p>
          <p className="text-base text-slate-500">
            {value.phone}
            {value.customer_code ? ` · ${value.customer_code}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-base font-medium text-brand-600 hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <form
        onSubmit={handleCreate}
        className="space-y-2 rounded-xl border border-brand-100 bg-brand-50/40 p-3"
      >
        <p className="text-sm font-medium text-slate-600">New customer</p>
        {createError && <p className="text-sm text-red-600">{createError}</p>}
        <input
          autoFocus
          placeholder="Full name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
            +91
          </span>
          <input
            placeholder="98765 43210"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-2 pl-11 pr-3 text-base"
          />
        </div>
        {newPhone && !isValidIndianMobile(newPhone) && (
          <p className="text-sm text-red-600">Enter a valid 10-digit Indian mobile number.</p>
        )}
        {newPhoneDuplicate && (
          <div className="rounded-lg bg-amber-50 px-2.5 py-2 text-sm text-amber-800">
            Already a customer: <span className="font-medium">{newPhoneDuplicate.full_name}</span>
            <button
              type="button"
              onClick={() => handleSelect(newPhoneDuplicate)}
              className="ml-2 font-medium text-brand-700 underline"
            >
              Use this customer
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-600 px-3 py-1.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create customer"}
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-base text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-9 text-base"
        />
        <ChevronDown
          size={18}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-violet-100 bg-white shadow-popover">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-base text-slate-400">No customers found.</p>
          )}
          {filtered.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => handleSelect(c)}
              className="block w-full border-b border-slate-50 px-3 py-2 text-left text-base last:border-0 hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{c.full_name}</span>{" "}
              <span className="text-slate-400">{c.phone}</span>
            </button>
          ))}
          {allowCreate && (
            <button
              type="button"
              onMouseDown={() => clearTimeout(blurTimeout.current)}
              onClick={startCreate}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-base font-medium text-brand-600 hover:bg-brand-50"
            >
              <UserPlus size={16} /> Create new customer{search ? ` "${search}"` : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
