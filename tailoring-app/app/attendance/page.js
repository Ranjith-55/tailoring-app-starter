"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import PageHeader from "../../components/ui/PageHeader";
import { CalendarIcon } from "../../components/ui/icons";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { useToast } from "../../components/ToastProvider";

const STATUS_OPTIONS = [
  { value: "present", label: "Present", letter: "P", active: "bg-emerald-500 text-white", cell: "bg-emerald-50 text-emerald-700" },
  { value: "absent", label: "Absent", letter: "A", active: "bg-red-500 text-white", cell: "bg-red-50 text-red-700" },
  { value: "half_day", label: "Half-day", letter: "H", active: "bg-amber-500 text-white", cell: "bg-amber-50 text-amber-700" },
  { value: "leave", label: "Leave", letter: "L", active: "bg-slate-400 text-white", cell: "bg-slate-100 text-slate-600" },
];

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function currentMonthStr() {
  return todayStr().slice(0, 7);
}

function daysInMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export default function AttendancePage() {
  return (
    <ProtectedRoute ownerOnly>
      <AttendanceContent />
    </ProtectedRoute>
  );
}

function AttendanceContent() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [staffList, setStaffList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dayAttendance, setDayAttendance] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [monthAttendance, setMonthAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStaff() {
      const { data } = await supabase
        .from("staff")
        .select("id, full_name, job_role")
        .eq("is_active", true)
        .order("full_name");
      setStaffList(data || []);
      setLoading(false);
    }
    loadStaff();
  }, []);

  useEffect(() => {
    loadDayAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    loadMonthAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  async function loadDayAttendance() {
    const { data } = await supabase
      .from("staff_attendance")
      .select("staff_id, status")
      .eq("date", selectedDate);
    const map = {};
    (data || []).forEach((row) => {
      map[row.staff_id] = row.status;
    });
    setDayAttendance(map);
  }

  async function loadMonthAttendance() {
    const start = `${selectedMonth}-01`;
    const end = `${selectedMonth}-${String(daysInMonth(selectedMonth)).padStart(2, "0")}`;
    const { data } = await supabase
      .from("staff_attendance")
      .select("staff_id, date, status")
      .gte("date", start)
      .lte("date", end);
    const map = {};
    (data || []).forEach((row) => {
      const day = Number(row.date.slice(8, 10));
      map[`${row.staff_id}-${day}`] = row.status;
    });
    setMonthAttendance(map);
  }

  async function markAttendance(staffId, status) {
    setDayAttendance((prev) => ({ ...prev, [staffId]: status }));
    const { error } = await supabase.from("staff_attendance").upsert(
      { staff_id: staffId, date: selectedDate, status, marked_by: user.id, marked_at: new Date().toISOString() },
      { onConflict: "staff_id,date" }
    );
    if (error) {
      showError(error.message);
      loadDayAttendance();
      return;
    }
    showSuccess("Attendance marked.");
    if (selectedDate.slice(0, 7) === selectedMonth) loadMonthAttendance();
  }

  if (loading) return <p className="text-base text-slate-400">Loading…</p>;

  return (
    <div>
      <PageHeader icon={CalendarIcon} title="Attendance" subtitle="Daily marking and monthly overview" />

      <section className="rounded-3xl border border-violet-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500">
            Mark attendance
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-base"
          />
        </div>

        {staffList.length === 0 && (
          <p className="text-base text-slate-400">No active staff yet.</p>
        )}

        <div className="space-y-2">
          {staffList.map((s) => {
            const current = dayAttendance[s.id];
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{s.full_name}</p>
                  {s.job_role && <p className="text-sm text-slate-400">{s.job_role}</p>}
                </div>
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => markAttendance(s.id, opt.value)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                        current === opt.value ? opt.active : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500">
            Monthly overview
          </h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-base"
          />
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="text-left text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-2 py-1 font-medium text-slate-500">Staff</th>
                {Array.from({ length: daysInMonth(selectedMonth) }, (_, i) => i + 1).map((day) => (
                  <th key={day} className="px-1.5 py-1 text-center font-medium text-slate-400">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-2 py-1.5 font-medium text-slate-700">
                    {s.full_name}
                  </td>
                  {Array.from({ length: daysInMonth(selectedMonth) }, (_, i) => i + 1).map((day) => {
                    const status = monthAttendance[`${s.id}-${day}`];
                    const opt = STATUS_OPTIONS.find((o) => o.value === status);
                    return (
                      <td key={day} className="px-1 py-1 text-center">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                            opt ? opt.cell : "text-slate-300"
                          }`}
                        >
                          {opt ? opt.letter : "·"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          {STATUS_OPTIONS.map((opt) => (
            <span key={opt.value} className="flex items-center gap-1.5">
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded ${opt.cell}`}>
                {opt.letter}
              </span>
              {opt.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
