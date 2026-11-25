"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// Generic large centered dialog — dims the page behind it. Closes on
// Escape or a click on the backdrop. Children unmount when `open` is
// false, so any form inside resets itself fresh each time it opens.
export default function Modal({ open, onClose, title, children, maxWidth = "max-w-4xl" }) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[85vh] w-full ${maxWidth} flex-col rounded-3xl bg-white shadow-2xl`}>
        {(title || onClose) && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-6 sm:p-8 sm:pb-6">
            {title && <h2 className="text-xl font-bold text-slate-900">{title}</h2>}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 sm:pt-6">{children}</div>
      </div>
    </div>
  );
}
