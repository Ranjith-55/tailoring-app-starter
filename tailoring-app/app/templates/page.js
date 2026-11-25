"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import AddGarmentTypeForm from "../../components/AddGarmentTypeForm";
import { SettingsIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";

export default function TemplatesPage() {
  return (
    <ProtectedRoute ownerOnly>
      <TemplatesContent />
    </ProtectedRoute>
  );
}

function TemplatesContent() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("garment_templates").select("*").order("label");
    setTemplates(data || []);
    setLoading(false);
  }

  const filtered = templates.filter((t) =>
    `${t.label} ${t.type_key}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        icon={SettingsIcon}
        title="Garment templates"
        subtitle="Manage garment types and the measurement fields each one asks for"
      >
        <button
          onClick={() => setAdding(true)}
          className="whitespace-nowrap rounded-2xl bg-brand-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700"
        >
          + Add garment type
        </button>
      </PageHeader>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a garment type">
        <AddGarmentTypeForm
          userId={user?.id}
          onSaved={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <div className="rounded-3xl border border-violet-100 bg-white p-4">
        <input
          type="text"
          placeholder="Search garment types…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-xl border border-violet-100 bg-slate-50 px-3 py-2 text-base placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        {loading && <p className="text-base text-slate-400">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-base text-slate-400">No garment types match.</p>
        )}

        {filtered.length > 0 && (
          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Fields</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.type_key} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/templates/${t.type_key}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {t.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.type_key}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {(t.fields || []).length === 0
                        ? "Free-form notes"
                        : `${t.fields.length} field${t.fields.length === 1 ? "" : "s"}`}
                    </td>
                    <td className="px-4 py-3">
                      {t.is_active === false ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-500">
                          Hidden
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-700">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
