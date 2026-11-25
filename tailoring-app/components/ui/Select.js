"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Custom-styled dropdown replacing native <select>, so the open list matches
// the app's design system (rounded, violet borders) instead of the browser's
// unstyled default. `options` accepts plain strings or {value, label}.
export default function Select({ value, onChange, options, className = "", disabled = false, placeholder }) {
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef(null);

  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = normalized.find((o) => o.value === value);

  function handleSelect(v) {
    clearTimeout(blurTimeout.current);
    setOpen(false);
    onChange(v);
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onBlur={handleBlur}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium capitalize text-slate-700 hover:border-brand-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:border-slate-300"
      >
        {current?.label ?? placeholder ?? value}
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {!disabled && open && (
        <div className="absolute z-20 mt-1 w-max min-w-full overflow-hidden rounded-xl border border-violet-100 bg-white py-1 shadow-popover">
          {normalized.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleSelect(o.value)}
              className={`block w-full whitespace-nowrap px-3 py-2 text-left text-sm capitalize hover:bg-brand-50 ${
                o.value === value ? "bg-brand-50 font-medium text-brand-700" : "text-slate-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
