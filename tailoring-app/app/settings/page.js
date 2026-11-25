"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { UserCircle, Store, FileText, Download } from "lucide-react";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { SettingsIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { useToast } from "../../components/ToastProvider";

function downloadCSV(rows, filename, showError) {
  if (rows.length === 0) {
    showError("No rows in that date range.");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, profile, isOwner } = useAuth();

  return (
    <div>
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Manage your application preferences" />

      <div className="grid gap-6 lg:grid-cols-3">
        <PersonalProfileCard user={user} profile={profile} />
        {isOwner && <ShopProfileCard />}
        {isOwner && <PaymentTermsCard />}
      </div>

      {isOwner && <DataManagementCard />}
    </div>
  );
}

function SettingsCard({ icon: Icon, iconClass, title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon size={22} />
        </span>
        <div>
          <h2 className="font-bold text-ink">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PersonalProfileCard({ user, profile }) {
  const { showError } = useToast();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("staff")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      showError(error.message);
      return;
    }
    // Sidebar/Topbar read the profile via their own useAuth() call; reload
    // keeps them in sync without wiring a shared refetch for this one field.
    window.location.reload();
  }

  return (
    <SettingsCard icon={UserCircle} iconClass="bg-rose-50 text-rose-600" title="Personal Profile" subtitle="Update your personal profile details">
      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="space-y-1.5 text-base text-slate-700">
            <p>{profile?.full_name}</p>
            <p className="text-slate-500">{user?.email}</p>
            <p className="capitalize text-slate-500">{profile?.role}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="mt-4 w-full rounded-xl bg-rose-50 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100"
          >
            Edit Personal Profile
          </button>
        </>
      )}
    </SettingsCard>
  );
}

function ShopProfileCard() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [profileRow, setProfileRow] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ shop_name: "", phone: "", address: "", gst_number: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    let { data } = await supabase.from("shop_profile").select("*").eq("id", true).maybeSingle();
    if (!data) {
      const { data: created } = await supabase
        .from("shop_profile")
        .insert({ id: true })
        .select()
        .single();
      data = created;
    }
    setProfileRow(data);
    setForm({
      shop_name: data?.shop_name || "",
      phone: data?.phone || "",
      address: data?.address || "",
      gst_number: data?.gst_number || "",
    });
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("shop_profile")
      .update({ ...form, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", true);
    setSaving(false);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Shop profile saved.");
    setEditing(false);
    load();
  }

  if (loading) {
    return (
      <SettingsCard icon={Store} iconClass="bg-brand-50 text-brand-600" title="Shop Profile" subtitle="Loading…">
        <p className="text-base text-slate-400">Loading…</p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      icon={Store}
      iconClass="bg-brand-50 text-brand-600"
      title="Shop Profile"
      subtitle="View and update your shop information and GST details"
    >
      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <input
            placeholder="Shop name"
            value={form.shop_name}
            onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
          <input
            placeholder="GST number"
            value={form.gst_number}
            onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="space-y-1.5 text-base text-slate-700">
            <p>{profileRow?.shop_name || <span className="text-slate-400">Not set</span>}</p>
            <p className="text-slate-500">{profileRow?.phone || <span className="text-slate-400">Not set</span>}</p>
            <p className="text-slate-500">GST: {profileRow?.gst_number || "Not set"}</p>
            <p className="text-slate-500">{profileRow?.address || <span className="text-slate-400">Not set</span>}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="mt-4 w-full rounded-xl bg-brand-50 py-2 text-sm font-bold text-brand-600 hover:bg-brand-100"
          >
            Edit Shop Profile
          </button>
        </>
      )}
    </SettingsCard>
  );
}

function PaymentTermsCard() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [row, setRow] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ payment_terms: "", invoice_terms: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("shop_profile").select("*").eq("id", true).maybeSingle();
    setRow(data);
    setForm({ payment_terms: data?.payment_terms || "", invoice_terms: data?.invoice_terms || "" });
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("shop_profile")
      .update({ ...form, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", true);
    setSaving(false);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Payment & terms saved.");
    setEditing(false);
    load();
  }

  if (loading) {
    return (
      <SettingsCard icon={FileText} iconClass="bg-emerald-50 text-emerald-600" title="Payment & Terms" subtitle="Loading…">
        <p className="text-base text-slate-400">Loading…</p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      icon={FileText}
      iconClass="bg-emerald-50 text-emerald-600"
      title="Payment & Terms"
      subtitle="Manage payment terms, bill terms and conditions for invoices"
    >
      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Payment terms</label>
            <textarea
              rows={3}
              placeholder="e.g. 50% advance, balance on delivery"
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Invoicing terms &amp; conditions
            </label>
            <textarea
              rows={3}
              placeholder="e.g. No returns once stitched. Alterations within 7 days."
              value={form.invoice_terms}
              onChange={(e) => setForm({ ...form, invoice_terms: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="space-y-3 text-base">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Payment & Terms</span>
              <span className={row?.payment_terms ? "text-emerald-600" : "text-slate-400"}>
                {row?.payment_terms ? "Set" : "Not Set"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Invoicing Terms &amp; Conditions</span>
              <span className={row?.invoice_terms ? "text-emerald-600" : "text-slate-400"}>
                {row?.invoice_terms ? "Set" : "Not Set"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="mt-4 w-full rounded-xl bg-emerald-50 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
          >
            Edit
          </button>
        </>
      )}
    </SettingsCard>
  );
}

function DataManagementCard() {
  const { showSuccess, showError } = useToast();
  const [reportType, setReportType] = useState("orders");
  const [from, setFrom] = useState("2000-01-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      if (reportType === "orders") {
        const { data } = await supabase
          .from("orders")
          .select("order_number, garment_description, total_amount, amount_paid, status, due_date, created_at, customers(full_name)")
          .gte("created_at", from)
          .lte("created_at", `${to}T23:59:59`);
        downloadCSV(
          (data || []).map((o) => ({
            "Order #": o.order_number,
            Customer: o.customers?.full_name || "",
            Garment: o.garment_description,
            Total: o.total_amount,
            Paid: o.amount_paid,
            Status: o.status,
            "Due date": o.due_date || "",
          })),
          `orders-report-${from}-to-${to}.csv`,
          showError
        );
      } else if (reportType === "payments") {
        const { data } = await supabase
          .from("payments")
          .select("paid_at, amount, type, method, customers(full_name), orders(order_number)")
          .gte("paid_at", from)
          .lte("paid_at", `${to}T23:59:59`);
        downloadCSV(
          (data || []).map((p) => ({
            Date: p.paid_at?.slice(0, 10),
            Customer: p.customers?.full_name || "",
            Order: p.orders?.order_number || "",
            Amount: p.amount,
            Type: p.type,
            Method: p.method,
          })),
          `payments-report-${from}-to-${to}.csv`,
          showError
        );
      } else {
        const { data } = await supabase
          .from("expenses")
          .select("spent_at, category, description, amount")
          .gte("spent_at", from)
          .lte("spent_at", to);
        downloadCSV(
          (data || []).map((e) => ({
            Date: e.spent_at,
            Category: e.category,
            Description: e.description || "",
            Amount: e.amount,
          })),
          `expenses-report-${from}-to-${to}.csv`,
          showError
        );
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Download size={22} />
        </span>
        <div>
          <h2 className="font-bold text-ink">Data Management</h2>
          <p className="text-sm text-slate-500">Download CSV reports for your business analytics</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Report</label>
          <Select
            value={reportType}
            onChange={setReportType}
            options={[
              { value: "orders", label: "Orders Report" },
              { value: "payments", label: "Payments Report" },
              { value: "expenses", label: "Expenses Report" },
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-100 hover:bg-amber-600 disabled:opacity-50"
        >
          <Download size={16} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
    </div>
  );
}
