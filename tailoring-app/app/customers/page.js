"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { UsersIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";

const FILTERS = [
  { value: "all", label: "All customers" },
  { value: "balance_due", label: "Has balance due" },
  { value: "no_orders", label: "No orders yet" },
];

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<p className="text-base text-slate-400">Loading…</p>}>
        <CustomersContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    const [{ data: customerData }, { data: orderData }] = await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, phone, address, customer_code, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("orders").select("customer_id, total_amount, amount_paid"),
    ]);
    setCustomers(customerData || []);
    setOrders(orderData || []);
    setLoading(false);
  }

  function customerOrders(customerId) {
    return orders.filter((o) => o.customer_id === customerId);
  }

  const filtered = customers
    .filter((c) => `${c.full_name} ${c.phone} ${c.customer_code || ""}`.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => {
      if (filter === "all") return true;
      const custOrders = customerOrders(c.id);
      if (filter === "no_orders") return custOrders.length === 0;
      if (filter === "balance_due") {
        return custOrders.some((o) => (o.total_amount || 0) - (o.amount_paid || 0) > 0);
      }
      return true;
    });

  return (
    <div>
      <PageHeader
        icon={UsersIcon}
        title="Customers"
        subtitle="Customer profiles, order history and balances"
        action={{ href: "/customers/new", label: "+ Add customer" }}
      />

      <div className="rounded-3xl border border-violet-100 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-violet-100 bg-slate-50 px-3 py-2 text-base placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Select
            value={filter}
            onChange={setFilter}
            options={FILTERS}
            className="sm:w-56"
          />
        </div>

        {loading && <p className="text-base text-slate-400">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-base text-slate-400">No customers match.</p>
        )}

        {/* Card layout on mobile, table layout from md breakpoint up */}
        <div className="scrollbar-thin hidden overflow-x-auto rounded-xl border border-violet-100 md:block">
          <table className="w-full text-left text-base">
            <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{c.address || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:hidden">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-brand-700">{c.full_name}</p>
              <p className="text-base text-slate-500">{c.phone}</p>
              {c.address && <p className="text-base text-slate-400">{c.address}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
