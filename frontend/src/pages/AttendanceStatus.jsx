import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "../auth.jsx";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

function monthGrid(view) {
  const startOfMonth = view.startOf("month");
  const gridStart = startOfMonth.subtract(startOfMonth.day(), "day");
  const days = Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day"));
  return { days };
}

/* --------- Status Badge --------- */
function StatusBadge({ s, title }) {
  const map = {
    P: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
    HD: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
    A: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
    O: { bg: "#f3f4f6", color: "#4b5563", border: "#d1d5db" },
    L: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
    H: { bg: "#bfdbfe", color: "#1e3a8a", border: "#3b82f6" },
    "": { bg: "#fff", color: "#9ca3af", border: "#e5e7eb" },
  };
  const style = map[s || ""];
  return (
    <div
      title={title || ""}
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        padding: "2px 6px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: title ? "help" : "default",
      }}
    >
      {s || "-"}
    </div>
  );
}

export default function AttendanceStatus() {
  const { token } = useAuth();
  const [view, setView] = useState(dayjs());
  const [items, setItems] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [openDay, setOpenDay] = useState(null);
  const [dayReports, setDayReports] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

  // 🔹 Load reports and holidays for the month
  async function fetchAttendanceData() {
    if (!token) return;
    const from = view.startOf("month").format("YYYY-MM-DD");
    const to = view.endOf("month").format("YYYY-MM-DD");
    
    // Fetch reports
    try {
      const res = await fetch(
        `${API_BASE}/api/customers/my-reports?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch reports error:", err);
    }

    // Fetch holidays
    try {
      const res = await fetch(
        `${API_BASE}/api/holidays/range?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch holidays error:", err);
    }
  }

  useEffect(() => {
    fetchAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token]);

  // 🔹 Group by date (using LOCAL timezone, not UTC)
  const byDate = useMemo(() => {
    const map = {};
    for (const r of items) {
      // ✅ Fix: Convert to local date string (YYYY-MM-DD) to avoid timezone issues
      let d = "";
      if (r.date) {
        const dateObj = new Date(r.date);
        d = dayjs(dateObj).format("YYYY-MM-DD"); // Local timezone
      } else if (r.createdAt) {
        d = dayjs(r.createdAt).format("YYYY-MM-DD"); // Local timezone
      }
      if (!d) continue;
      if (!map[d]) map[d] = { external: 0, internal: 0, leave: 0, rows: [] };
      // ✅ Count both "External" and "Revisit" as external visits for attendance
      if (r.meetingType === "External" || r.meetingType === "Revisit") map[d].external++;
      if (r.meetingType === "Internal") map[d].internal++;
      if (r.meetingType === "Leave") map[d].leave++;
      map[d].rows.push(r);
    }
    return map;
  }, [items]);

  // 🔹 Attendance rule
  function statusFor(djs) {
    if (djs.day() === 0) return "O"; // Sunday = Weekly Off
    
    const key = djs.format("YYYY-MM-DD");
    
    // Check if it's a holiday
    const isHoliday = holidays.some(h => h.date === key);
    if (isHoliday) return "H";
    
    const c = byDate[key] || { external: 0, internal: 0, leave: 0 };
    if (c.leave > 0) return "L";
    if (c.internal >= 1) return "P";
    if (c.external >= 4) return "P";
    if (c.external > 0) return "HD";
    return "A";
  }

  // Get holiday name
  function getHolidayName(djs) {
    const key = djs.format("YYYY-MM-DD");
    const holiday = holidays.find(h => h.date === key);
    return holiday ? holiday.name : null;
  }

  // 🔹 Totals
  const totals = useMemo(() => {
    const { days } = monthGrid(view);
    let P = 0,
      HD = 0,
      A = 0,
      O = 0,
      L = 0,
      H = 0;
    for (const d of days) {
      const inMonth = d.month() === view.month() && d.year() === view.year();
      if (!inMonth) continue;
      const s = statusFor(d);
      if (s === "P") P++;
      else if (s === "HD") HD++;
      else if (s === "A") A++;
      else if (s === "O") O++;
      else if (s === "L") L++;
      else if (s === "H") H++;
    }
    return { P, HD, A, O, L, H };
  }, [view, byDate, holidays]);

  const { days } = monthGrid(view);

  // 🔹 Open modal with details
  async function openDayModal(d) {
    setOpenDay(d);
    setDayLoading(true);
    try {
      const ymd = d.format("YYYY-MM-DD");
      const res = await fetch(
        `${API_BASE}/api/customers/my-reports?from=${ymd}&to=${ymd}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setDayReports(Array.isArray(data) ? data : []);
    } finally {
      setDayLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0 }}>
          📅 Attendance Portal
        </h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setView(view.subtract(1, "month"))}
            style={btn}
          >
            ◀ Prev
          </button>
          <div style={{ fontWeight: "600" }}>{view.format("MMMM YYYY")}</div>
          <button onClick={() => setView(view.add(1, "month"))} style={btn}>
            Next ▶
          </button>
          <button
            onClick={fetchAttendanceData}
            style={{
              padding: "6px 14px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          background: "#f9fafb",
          padding: "10px",
          borderRadius: "8px",
          marginBottom: "16px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div><StatusBadge s="P" /> Present: <b>{totals.P}</b></div>
        <div><StatusBadge s="HD" /> Half Day: <b>{totals.HD}</b></div>
        <div><StatusBadge s="A" /> Absent: <b>{totals.A}</b></div>
        <div><StatusBadge s="O" /> Weekly Off: <b>{totals.O}</b></div>
        <div><StatusBadge s="H" /> Holiday: <b>{totals.H}</b></div>
        <div><StatusBadge s="L" /> Leave: <b>{totals.L}</b></div>
      </div>

      {/* Calendar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "6px",
        }}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            style={{
              textAlign: "center",
              fontWeight: "600",
              padding: "4px",
              color: "#374151",
            }}
          >
            {w}
          </div>
        ))}
        {days.map((d, i) => {
          const inMonth =
            d.month() === view.month() && d.year() === view.year();
          const s = inMonth ? statusFor(d) : "";
          const key = d.format("YYYY-MM-DD");
          const c = byDate[key] || { external: 0, internal: 0 };
          const holidayName = inMonth ? getHolidayName(d) : null;
          return (
            <button
              key={i}
              disabled={!inMonth}
              onClick={() => inMonth && openDayModal(d)}
              title={holidayName || ""}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                height: "100px",
                padding: "6px",
                textAlign: "left",
                background: inMonth ? (s === "H" ? "#dbeafe" : "#fff") : "#f3f4f6",
                color: inMonth ? "#111" : "#9ca3af",
                cursor: inMonth ? "pointer" : "not-allowed",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                <span>{d.date()}</span>
                <StatusBadge s={s} title={holidayName} />
              </div>
              {inMonth && holidayName && (
                <div style={{ fontSize: "10px", color: "#1e40af", fontWeight: 600 }}>
                  🎉 {holidayName}
                </div>
              )}
              {inMonth && !holidayName && (
                <div style={{ fontSize: "11px", color: "#374151" }}>
                  Ext: <b>{c.external}</b> · Int: <b>{c.internal}</b>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {openDay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            zIndex: 20,
          }}
          onClick={() => setOpenDay(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "16px",
              width: "90%",
              maxWidth: "800px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ fontWeight: "600" }}>
                Details — {openDay.format("DD MMM YYYY")} ({openDay.format("ddd")})
              </h3>
              <button onClick={() => setOpenDay(null)} style={btn}>
                Close
              </button>
            </div>

            {dayLoading ? (
              <p style={{ padding: "10px", color: "#4b5563" }}>Loading…</p>
            ) : dayReports.length === 0 ? (
              <p style={{ padding: "10px", color: "#4b5563" }}>
                No records found.
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={th}>Time</th>
                    <th style={th}>Meeting Type</th>
                    <th style={th}>Name</th>
                    <th style={th}>Company</th>
                    <th style={th}>Discussion</th>
                  </tr>
                </thead>
                <tbody>
                  {dayReports.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                      <td style={td}>
                        {r.date ? new Date(r.date).toLocaleTimeString() : "-"}
                      </td>
                      <td style={td}>{r.meetingType}</td>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.company}</td>
                      <td style={td}>{r.discussion || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Common Styles --- */
const btn = {
  padding: "6px 12px",
  border: "1px solid #ddd",
  borderRadius: "6px",
  background: "#f9fafb",
  cursor: "pointer",
};

const th = {
  padding: "8px",
  textAlign: "left",
  fontSize: "13px",
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: "8px",
  fontSize: "13px",
};
