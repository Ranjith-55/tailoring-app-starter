"use client";

// Shared page header: icon badge + bold title + subtitle + optional primary
// action button, matching the reference screenshots. `action` is optional
// {href, label}; pass `children` instead for something more custom (e.g. a
// button with an onClick).
export default function PageHeader({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon className="h-7 w-7" />
          </span>
        )}
        <div>
          <h1 className="text-3xl font-black capitalize tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="text-base text-slate-500">{subtitle}</p>}
        </div>
      </div>

      {action && (
        <a
          href={action.href}
          className="whitespace-nowrap rounded-2xl bg-brand-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700"
        >
          {action.label}
        </a>
      )}
      {children}
    </div>
  );
}
