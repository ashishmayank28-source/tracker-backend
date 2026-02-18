// frontend/src/pages/TeamAttendance.jsx - Team Attendance for Manager, BM, RM
import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import { useAuth } from "../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function TeamAttendance() {
  const { user, token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  // Salary cycle: 26th of previous month to 25th of current month
  const salaryCycleStart = useMemo(() => {
    return selectedMonth.subtract(1, "month").date(26);
  }, [selectedMonth]);

  const salaryCycleEnd = useMemo(() => {
    return selectedMonth.date(25);
  }, [selectedMonth]);

  // Generate dates for the salary cycle
  const cycleDates = useMemo(() => {
    const dates = [];
    let current = salaryCycleStart;
    while (current.isBefore(salaryCycleEnd) || current.isSame(salaryCycleEnd, "day")) {
      dates.push(current);
      current = current.add(1, "day");
    }
    return dates;
  }, [salaryCycleStart, salaryCycleEnd]);

  // Fetch team members
  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // ✅ Filter ONLY Employees (they fill DSR for attendance)
      const emps = (Array.isArray(data) ? data : []).filter(
        (u) => u.role === "Employee"
      );
      setEmployees(emps);
      return emps;
    } catch (err) {
      console.error("Team fetch error:", err);
      return [];
    }
  }, [token]);

  // Fetch attendance for all team members
  const fetchAttendance = useCallback(async (empList) => {
    const from = salaryCycleStart.format("YYYY-MM-DD");
    const to = salaryCycleEnd.format("YYYY-MM-DD");

    const attendanceMap = {};

    for (const emp of empList) {
      try {
        const res = await fetch(
          `${API_BASE}/api/customers/reports-by-emp/${emp.empCode}?from=${from}&to=${to}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const reports = await res.json();

        // Group by date
        const byDate = {};
        (Array.isArray(reports) ? reports : []).forEach((r) => {
          // ✅ Use LOCAL timezone date key (avoid UTC slice shifting days)
          let d = "";
          if (r.date) {
            const dateObj = new Date(r.date);
            d = dayjs(dateObj).format("YYYY-MM-DD");
          } else if (r.createdAt) {
            d = dayjs(r.createdAt).format("YYYY-MM-DD");
          }
          if (!d) return;
          if (!byDate[d]) byDate[d] = { external: 0, internal: 0, leave: 0 };
          if (r.meetingType === "External" || r.meetingType === "Revisit") byDate[d].external++;
          if (r.meetingType === "Internal") byDate[d].internal++;
          if (r.meetingType === "Leave") byDate[d].leave++;
        });

        attendanceMap[emp.empCode] = byDate;
      } catch (err) {
        console.error(`Attendance fetch error for ${emp.empCode}:`, err);
        attendanceMap[emp.empCode] = {};
      }
    }

    setAttendanceData(attendanceMap);
  }, [token, salaryCycleStart, salaryCycleEnd]);

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    try {
      const from = salaryCycleStart.format("YYYY-MM-DD");
      const to = salaryCycleEnd.format("YYYY-MM-DD");
      const res = await fetch(`${API_BASE}/api/holidays/range?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch holidays error:", err);
      setHolidays([]);
    }
  }, [token, salaryCycleStart, salaryCycleEnd]);

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await fetchHolidays();
      const empList = await fetchTeam();
      await fetchAttendance(empList);
      setLoading(false);
    }
    if (token) loadData();
  }, [token, fetchTeam, fetchAttendance, fetchHolidays]);

  // Get status for a date
  function getStatus(empCode, date) {
    const dayOfWeek = date.day();
    const dateStr = date.format("YYYY-MM-DD");
    const empData = attendanceData[empCode] || {};
    const c = empData[dateStr] || { external: 0, internal: 0, leave: 0 };

    if (dayOfWeek === 0) return "O"; // Sunday
    const isHoliday = holidays.some(h => h.date === dateStr);
    if (isHoliday) return "H";
    if (c.leave > 0) return "L";
    if (c.internal >= 1) return "P";
    if (c.external >= 4) return "P";
    if (c.external > 0) return "HD";
    return "A";
  }

  // Calculate totals
  function calculateTotals(empCode) {
    let present = 0, weekoff = 0, holiday = 0, leave = 0, halfDay = 0, absent = 0;

    cycleDates.forEach((date) => {
      const status = getStatus(empCode, date);
      switch (status) {
        case "P": present++; break;
        case "O": weekoff++; break;
        case "H": holiday++; break;
        case "L": leave++; break;
        case "HD": halfDay++; break;
        case "A": absent++; break;
      }
    });

    const payDays = present + (halfDay * 0.5) + weekoff + holiday;
    return { present, weekoff, holiday, leave, halfDay, absent, payDays };
  }

  // Status cell style
  function getStatusStyle(status) {
    const styles = {
      P: { bg: "#22c55e", color: "white" },
      O: { bg: "#6b7280", color: "white" },
      H: { bg: "#3b82f6", color: "white" },
      A: { bg: "#ef4444", color: "white" },
      L: { bg: "#8b5cf6", color: "white" },
      HD: { bg: "#f59e0b", color: "white" },
    };
    return styles[status] || { bg: "#e5e7eb", color: "#374151" };
  }

  // Export to Excel
  function exportToExcel() {
    const data = employees.map((emp, idx) => {
      const totals = calculateTotals(emp.empCode);
      const row = {
        "Sr. No": idx + 1,
        "Emp Code": emp.empCode,
        "Emp Name": emp.name,
        "Role": emp.role,
        "Branch": emp.branch || "-",
      };

      cycleDates.forEach(date => {
        row[date.format("DD-MMM")] = getStatus(emp.empCode, date);
      });

      row["Present"] = totals.present;
      row["Weekoff"] = totals.weekoff;
      row["Holiday"] = totals.holiday;
      row["Leave"] = totals.leave;
      row["Half Day"] = totals.halfDay;
      row["Absent"] = totals.absent;
      row["Pay Days"] = totals.payDays;

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team Attendance");

    const fileName = `Team_Attendance_${salaryCycleStart.format("DD-MMM")}_to_${salaryCycleEnd.format("DD-MMM-YYYY")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  const navBtn = {
    padding: "8px 16px",
    background: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "white",
    fontWeight: 600,
  };

  return (
    <div style={{ padding: 20 }}>
      {loading ? (
        <p style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Loading attendance data...</p>
      ) : (
        <>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px 12px 0 0",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📅 Team Attendance</h2>
                <p style={{ margin: "8px 0 0 0", fontSize: 14, opacity: 0.9 }}>
                  Salary Cycle: <strong>{salaryCycleStart.format("DD MMM YYYY")}</strong> to <strong>{salaryCycleEnd.format("DD MMM YYYY")}</strong>
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => setSelectedMonth(selectedMonth.subtract(1, "month"))} style={navBtn}>
                  ◀ Prev
                </button>
                <span style={{ fontWeight: 600, minWidth: 120, textAlign: "center" }}>
                  {selectedMonth.format("MMMM YYYY")}
                </span>
                <button onClick={() => setSelectedMonth(selectedMonth.add(1, "month"))} style={navBtn}>
                  Next ▶
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
              {[
                { label: "P = Present", bg: "#22c55e" },
                { label: "O = Weekoff", bg: "#6b7280" },
                { label: "H = Holiday", bg: "#3b82f6" },
                { label: "L = Leave", bg: "#8b5cf6" },
                { label: "HD = Half Day", bg: "#f59e0b" },
                { label: "A = Absent", bg: "#ef4444" },
              ].map(item => (
                <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: item.bg }}></span>
                  {item.label}
                </span>
              ))}
            </div>
            <button
              onClick={exportToExcel}
              style={{
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              📥 Export to Excel
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "0 0 12px 12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={thStyle}>Sr.</th>
                  <th style={thStyle}>Emp Code</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Branch</th>
                  {cycleDates.map(date => (
                    <th key={date.format("YYYY-MM-DD")} style={{ ...thStyle, minWidth: 30, textAlign: "center" }}>
                      <div style={{ fontSize: 10 }}>{date.format("ddd")}</div>
                      <div>{date.format("DD")}</div>
                    </th>
                  ))}
                  <th style={{ ...thStyle, background: "#dbeafe" }}>P</th>
                  <th style={{ ...thStyle, background: "#f3f4f6" }}>O</th>
                  <th style={{ ...thStyle, background: "#dbeafe" }}>H</th>
                  <th style={{ ...thStyle, background: "#ede9fe" }}>L</th>
                  <th style={{ ...thStyle, background: "#fef3c7" }}>HD</th>
                  <th style={{ ...thStyle, background: "#fee2e2" }}>A</th>
                  <th style={{ ...thStyle, background: "#dcfce7", fontWeight: 700 }}>Pay Days</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={cycleDates.length + 12} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                      No team members found
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, idx) => {
                    const totals = calculateTotals(emp.empCode);
                    return (
                      <tr key={emp.empCode} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={tdStyle}>{idx + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "#3b82f6" }}>{emp.empCode}</td>
                        <td style={tdStyle}>{emp.name}</td>
                        <td style={tdStyle}>{emp.role}</td>
                        <td style={tdStyle}>{emp.branch || "-"}</td>
                        {cycleDates.map(date => {
                          const status = getStatus(emp.empCode, date);
                          const style = getStatusStyle(status);
                          return (
                            <td
                              key={date.format("YYYY-MM-DD")}
                              style={{
                                ...tdStyle,
                                textAlign: "center",
                                background: style.bg,
                                color: style.color,
                                fontWeight: 600,
                                fontSize: 10,
                                padding: "4px 2px",
                              }}
                            >
                              {status}
                            </td>
                          );
                        })}
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, color: "#22c55e" }}>{totals.present}</td>
                        <td style={{ ...tdStyle, textAlign: "center", color: "#6b7280" }}>{totals.weekoff}</td>
                        <td style={{ ...tdStyle, textAlign: "center", color: "#3b82f6" }}>{totals.holiday}</td>
                        <td style={{ ...tdStyle, textAlign: "center", color: "#8b5cf6" }}>{totals.leave}</td>
                        <td style={{ ...tdStyle, textAlign: "center", color: "#f59e0b" }}>{totals.halfDay}</td>
                        <td style={{ ...tdStyle, textAlign: "center", color: "#ef4444" }}>{totals.absent}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: "#16a34a", background: "#dcfce7" }}>
                          {totals.payDays}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = { padding: "10px 6px", textAlign: "left", fontWeight: 600, fontSize: 11, borderBottom: "2px solid #e2e8f0", position: "sticky", top: 0, background: "#f1f5f9" };
const tdStyle = { padding: "8px 6px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
