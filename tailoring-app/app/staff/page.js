"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import { StaffIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const ATTENDANCE_LABEL = {
  present: "Present",
  absent: "Absent",
  half_day: "Half-day",
  leave: "Leave",
};

// Owner-only page — ProtectedRoute redirects staff away, and RLS on the
// `staff` table (see supabase/schema.sql) blocks writes at the database
// level too, so this is enforced even if someone bypasses the UI.
export default function StaffPage() {
  return (
    <ProtectedRoute ownerOnly>
      <StaffContent />
    </ProtectedRoute>
  );
}

function StaffContent() {
  const [staff, setStaff] = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [todayAttendance, setTodayAttendance] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    const [{ data: staffData }, { data: orderData }, { data: attendanceData }] = await Promise.all([
      supabase.from("staff").select("*").order("created_at"),
      supabase.from("orders").select("assigned_to, status"),
      supabase.from("staff_attendance").select("staff_id, status").eq("date", todayStr()),
    ]);

    setStaff(staffData || []);

    const counts = {};
    (orderData || []).forEach((o) => {
      if (!o.assigned_to || ["delivered", "cancelled"].includes(o.status)) return;
      counts[o.assigned_to] = (counts[o.assigned_to] || 0) + 1;
    });
    setTaskCounts(counts);

    const attendance = {};
    (attendanceData || []).forEach((a) => {
      attendance[a.staff_id] = a.status;
    });
    setTodayAttendance(attendance);

    setLoading(false);
  }

  const filtered = staff.filter((s) =>
    `${s.full_name} ${s.job_role || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        icon={StaffIcon}
        title="Staff"
        subtitle="Team members, roles, and assigned work"
        action={{ href: "/staff/new", label: "+ Add new staff" }}
      />

      <div>
        <section className="rounded-3xl border border-violet-100 bg-white p-5">
          <input
            type="text"
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 w-full rounded-xl border border-violet-100 bg-slate-50 px-3 py-2 text-base placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          {loading && <p className="text-base text-slate-400">Loading…</p>}

          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Active tasks</th>
                  <th className="px-4 py-3 font-medium">Today</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/staff/${member.id}`} className="font-medium text-brand-700 hover:underline">
                        {member.full_name}
                      </Link>
                      {!member.is_active && (
                        <span className="ml-2 text-sm text-red-500">inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{member.job_role || member.role}</td>
                    <td className="px-4 py-3 text-slate-700">{taskCounts[member.id] || 0} tasks</td>
                    <td className="px-4 py-3 text-slate-500">
                      {ATTENDANCE_LABEL[todayAttendance[member.id]] || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
