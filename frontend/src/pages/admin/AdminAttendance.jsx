import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import { useAuth } from "../../auth.jsx";
import HolidayCalendar from "./HolidayCalendar.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AdminAttendance() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("attendance"); // "attendance" or "holidays"
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

  // Fetch all employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Filter only employees
      const emps = (Array.isArray(data) ? data : []).filter(
        (u) => u.role === "Employee"
      );
      setEmployees(emps);
      return emps;
    } catch (err) {
      console.error("Employees fetch error:", err);
      return [];
    }
  }, [token]);

  // Fetch attendance for all employees
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
          const d = (r.date && String(r.date).slice(0, 10)) ||
            (r.createdAt ? dayjs(r.createdAt).format("YYYY-MM-DD") : "");
          if (!d) return;
          if (!byDate[d]) byDate[d] = { external: 0, internal: 0, leave: 0 };
          if (r.meetingType === "External") byDate[d].external++;
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

  // Fetch holidays from database
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
      const empList = await fetchEmployees();
      await fetchAttendance(empList);
      setLoading(false);
    }
    if (token) loadData();
  }, [token, fetchEmployees, fetchAttendance, fetchHolidays]);

  // Get status for a date
  function getStatus(empCode, date) {
    const dayOfWeek = date.day();
    const dateStr = date.format("YYYY-MM-DD");
    const empData = attendanceData[empCode] || {};
    const c = empData[dateStr] || { external: 0, internal: 0, leave: 0 };

    // Sunday = Weekly Off (O)
    if (dayOfWeek === 0) return "O";
    
    // Check if it's a public holiday (from database)
    const isHoliday = holidays.some(h => h.date === dateStr);
    if (isHoliday) return "H";
    
    // Check for Leave
    if (c.leave > 0) return "L";
    
    // Internal meeting = Present
    if (c.internal >= 1) return "P";
    
    // 4+ external = Present
    if (c.external >= 4) return "P";
    
    // Some external but less than 4 = Half Day (show as HD but count differently)
    if (c.external > 0) return "HD";
    
    // No activity = Absent
    return "A";
  }

  // Get holiday name for tooltip
  function getHolidayName(date) {
    const dateStr = date.format("YYYY-MM-DD");
    const holiday = holidays.find(h => h.date === dateStr);
    return holiday ? holiday.name : null;
  }

  // Export to Excel
  function exportToExcel() {
    const data = employees.map((emp, idx) => {
      const totals = calculateTotals(emp.empCode);
      const row = {
        "Sr. No": idx + 1,
        "Emp Code": emp.empCode,
        "Emp Name": emp.name,
      };
      
      // Add date columns
      cycleDates.forEach(date => {
        const status = getStatus(emp.empCode, date);
        row[date.format("DD-MMM")] = status;
      });
      
      // Add summary columns
      row["Present Days"] = totals.present;
      row["Weekoff"] = totals.weekoff;
      row["Holiday"] = totals.holiday;
      row["Leave"] = totals.leave;
      row["Half Day"] = totals.halfDay;
      row["Absent"] = totals.absent;
      row["Pay Days"] = totals.payDays;
      row["DOL"] = emp.dateOfLeaving || "-";
      row["Remarks"] = emp.remarks || "-";
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    
    const fileName = `Attendance_${salaryCycleStart.format("DD-MMM")}_to_${salaryCycleEnd.format("DD-MMM-YYYY")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // Calculate totals for an employee
  function calculateTotals(empCode) {
    let present = 0, weekoff = 0, holiday = 0, leave = 0, halfDay = 0, absent = 0;
    
    cycleDates.forEach((date) => {
      const status = getStatus(empCode, date);
      switch (status) {
        case "P": present++; break;
        case "O": weekoff++; break;  // Sunday = Weekly Off
        case "H": holiday++; break;  // Public Holiday
        case "L": leave++; break;
        case "HD": halfDay++; break;
        case "A": absent++; break;
      }
    });

    // Pay Days = Present + Half Day(0.5) + Weekly Off + Holiday
    const payDays = present + (halfDay * 0.5) + weekoff + holiday;
    
    return { present, weekoff, holiday, leave, halfDay, absent, payDays };
  }

  // Status cell style
  function getStatusStyle(status) {
    const styles = {
      P: { bg: "#22c55e", color: "white" },   // Present - Green
      O: { bg: "#6b7280", color: "white" },   // Weekly Off (Sunday) - Gray
      H: { bg: "#3b82f6", color: "white" },   // Holiday - Blue
      A: { bg: "#ef4444", color: "white" },   // Absent - Red
      L: { bg: "#8b5cf6", color: "white" },   // Leave - Purple
      HD: { bg: "#f59e0b", color: "white" },  // Half Day - Orange
    };
    return styles[status] || { bg: "#e5e7eb", color: "#374151" };
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("attendance")}
          style={{
            padding: "12px 24px",
            background: activeTab === "attendance" ? "#3b82f6" : "#e5e7eb",
            color: activeTab === "attendance" ? "white" : "#374151",
            border: "none",
            borderRadius: "8px 0 0 8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          📅 Attendance Details
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          style={{
            padding: "12px 24px",
            background: activeTab === "holidays" ? "#3b82f6" : "#e5e7eb",
            color: activeTab === "holidays" ? "white" : "#374151",
            border: "none",
            borderRadius: "0 8px 8px 0",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          🗓️ Holiday Calendar
        </button>
      </div>

      {/* Holiday Calendar Tab */}
      {activeTab === "holidays" && <HolidayCalendar />}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <>
          {loading ? (
            <p>Loading attendance data...</p>
          ) : (
            <>
      {/* Header */}
      <div style={{ 
        background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", 
        color: "white", 
        padding: "16px 24px", 
        borderRadius: "12px 12px 0 0",
        marginBottom: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📅 Attendance Details</h2>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, opacity: 0.9 }}>
              Salary Cycle from <strong>{salaryCycleStart.format("DD MMM YYYY")}</strong> to <strong>{salaryCycleEnd.format("DD MMM YYYY")}</strong>
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
            <button 
              onClick={() => { fetchEmployees().then(fetchAttendance); }} 
              style={{ ...navBtn, background: "#22c55e" }}
            >
              🔄 Refresh
            </button>
            <button 
              onClick={exportToExcel} 
              style={{ ...navBtn, background: "#f59e0b" }}
            >
              📤 Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ 
        display: "flex", 
        gap: 20, 
        padding: "12px 24px", 
        background: "#f1f5f9", 
        borderBottom: "1px solid #e2e8f0",
        flexWrap: "wrap",
        fontSize: 13,
      }}>
        <LegendItem label="P - Present" color="#22c55e" />
        <LegendItem label="A - Absent" color="#ef4444" />
        <LegendItem label="O - Weekly Off (Sunday)" color="#6b7280" />
        <LegendItem label="H - Holiday" color="#3b82f6" />
        <LegendItem label="L - Leave" color="#8b5cf6" />
        <LegendItem label="HD - Half Day" color="#f59e0b" />
      </div>

      {/* Table Container */}
      <div style={{ 
        overflowX: "auto", 
        border: "1px solid #e2e8f0",
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
      }}>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          fontSize: 12,
          minWidth: 1400,
        }}>
          <thead>
            {/* Date Headers */}
            <tr style={{ background: "#dbeafe" }}>
              <th style={{ ...th, minWidth: 50, position: "sticky", left: 0, background: "#dbeafe", zIndex: 2 }}>Sr.</th>
              <th style={{ ...th, minWidth: 70, position: "sticky", left: 50, background: "#dbeafe", zIndex: 2 }}>Emp Code</th>
              <th style={{ ...th, minWidth: 150, position: "sticky", left: 120, background: "#dbeafe", zIndex: 2 }}>Emp. Name</th>
              {cycleDates.map((date, i) => (
                <th key={i} style={{ ...th, minWidth: 45, textAlign: "center" }}>
                  <div>{date.format("DD MMM")}</div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{date.format("ddd")}</div>
                </th>
              ))}
              <th style={{ ...th, background: "#bbf7d0", minWidth: 60 }}>Present</th>
              <th style={{ ...th, background: "#bfdbfe", minWidth: 60 }}>Weekoff</th>
              <th style={{ ...th, background: "#bfdbfe", minWidth: 60 }}>Holiday</th>
              <th style={{ ...th, background: "#ddd6fe", minWidth: 50 }}>Leave</th>
              <th style={{ ...th, background: "#fef08a", minWidth: 60 }}>Half Day</th>
              <th style={{ ...th, background: "#fecaca", minWidth: 55 }}>Absent</th>
              <th style={{ ...th, background: "#86efac", minWidth: 65, fontWeight: 700 }}>Pay Days</th>
              <th style={{ ...th, minWidth: 80 }}>DOL</th>
              <th style={{ ...th, minWidth: 100 }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const totals = calculateTotals(emp.empCode);
              return (
                <tr key={emp.empCode} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ ...td, position: "sticky", left: 0, background: "#fff", zIndex: 1, fontWeight: 600 }}>
                    {idx + 1}
                  </td>
                  <td style={{ ...td, position: "sticky", left: 50, background: "#fff", zIndex: 1 }}>
                    {emp.empCode}
                  </td>
                  <td style={{ ...td, position: "sticky", left: 120, background: "#fff", zIndex: 1, fontWeight: 500 }}>
                    {emp.name}
                  </td>
                  {cycleDates.map((date, i) => {
                    const status = getStatus(emp.empCode, date);
                    const style = getStatusStyle(status);
                    return (
                      <td 
                        key={i} 
                        style={{ 
                          ...td, 
                          textAlign: "center", 
                          background: style.bg, 
                          color: style.color,
                          fontWeight: 600,
                          padding: "8px 4px",
                        }}
                      >
                        {status}
                      </td>
                    );
                  })}
                  <td style={{ ...td, textAlign: "center", fontWeight: 600, background: "#f0fdf4" }}>
                    {totals.present}
                  </td>
                  <td style={{ ...td, textAlign: "center", background: "#eff6ff" }}>
                    {totals.weekoff}
                  </td>
                  <td style={{ ...td, textAlign: "center", background: "#eff6ff" }}>
                    {totals.holiday}
                  </td>
                  <td style={{ ...td, textAlign: "center", background: "#f5f3ff" }}>
                    {totals.leave}
                  </td>
                  <td style={{ ...td, textAlign: "center", background: "#fefce8" }}>
                    {totals.halfDay}
                  </td>
                  <td style={{ ...td, textAlign: "center", background: "#fef2f2", color: "#dc2626", fontWeight: 600 }}>
                    {totals.absent}
                  </td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 700, background: "#dcfce7", color: "#166534" }}>
                    {totals.payDays}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    {emp.dateOfLeaving || "-"}
                  </td>
                  <td style={{ ...td }}>
                    {emp.remarks || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div style={{ 
        marginTop: 20, 
        padding: 16, 
        background: "#f8fafc", 
        borderRadius: 8, 
        border: "1px solid #e2e8f0",
      }}>
        <strong>📊 Summary:</strong> Total Employees: {employees.length} | 
        Cycle: {salaryCycleStart.format("DD/MM/YYYY")} - {salaryCycleEnd.format("DD/MM/YYYY")} | 
        Days in Cycle: {cycleDates.length}
      </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* Legend Item */
function LegendItem({ label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ 
        width: 20, 
        height: 20, 
        background: color, 
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 600,
        fontSize: 10,
      }}>
        {label.charAt(0)}
      </div>
      <span>{label}</span>
    </div>
  );
}

/* Styles */
const navBtn = {
  padding: "6px 14px",
  background: "rgba(255,255,255,0.2)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 6,
  color: "white",
  cursor: "pointer",
  fontWeight: 500,
};

const th = {
  padding: "10px 8px",
  textAlign: "left",
  borderBottom: "2px solid #cbd5e1",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const td = {
  padding: "8px",
  borderRight: "1px solid #f1f5f9",
};

