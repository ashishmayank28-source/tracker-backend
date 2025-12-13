import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth.jsx";
import dayjs from "dayjs";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function PerformanceReviewBranch() {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD"),
  });

  // Selected employee for detail view
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empDetails, setEmpDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fetch branch employees
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const emps = Array.isArray(data) ? data.filter(e => e.role === "Employee" || e.role === "Manager") : [];
      setEmployees(emps);
    } catch (err) {
      console.error("Fetch employees error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchEmployees();
  }, [token, fetchEmployees]);

  // Fetch employee details
  async function fetchEmpDetails(emp) {
    setSelectedEmp(emp);
    setDetailsLoading(true);
    
    try {
      const { from, to } = dateRange;
      
      // Fetch attendance/visits data
      const attendanceRes = await fetch(
        `${API_BASE}/api/customers/reports-by-emp/${emp.empCode}?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const attendance = await attendanceRes.json();
      
      // Fetch sample boards data
      let samplesUsed = 0;
      let samplesAssigned = 0;
      try {
        const samplesRes = await fetch(
          `${API_BASE}/api/assignments/employee/${emp.empCode}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const samplesData = await samplesRes.json();
        if (samplesData.stock) {
          samplesAssigned = samplesData.stock.reduce((sum, s) => sum + (s.total || 0), 0);
          samplesUsed = samplesData.stock.reduce((sum, s) => sum + (s.used || 0), 0);
        }
      } catch (e) {
        console.log("Sample data not available");
      }

      // Calculate metrics
      const reports = Array.isArray(attendance) ? attendance : [];
      const totalVisits = reports.length;
      const externalVisits = reports.filter(r => r.meetingType === "External").length;
      const internalVisits = reports.filter(r => r.meetingType === "Internal").length;
      const ordersWon = reports.filter(r => r.orderStatus === "Won" || r.orderStatus === "Approved").length;
      const totalRevenue = reports
        .filter(r => r.orderStatus === "Won" || r.orderStatus === "Approved")
        .reduce((sum, r) => sum + (Number(r.orderValue) || 0), 0);

      // Calculate attendance
      const workingDays = dayjs(to).diff(dayjs(from), "day") + 1;
      const presentDays = new Set(reports.map(r => dayjs(r.date || r.createdAt).format("YYYY-MM-DD"))).size;
      const attendancePercent = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

      setEmpDetails({
        totalVisits,
        externalVisits,
        internalVisits,
        ordersWon,
        totalRevenue,
        attendancePercent,
        presentDays,
        workingDays,
        samplesAssigned,
        samplesUsed,
        target: emp.target || 0,
        achieved: emp.achieved || 0,
      });
    } catch (err) {
      console.error("Fetch details error:", err);
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⭐ Branch Performance Review</h2>
        <button
          onClick={fetchEmployees}
          style={{
            padding: "8px 16px",
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

      {/* Branch Info */}
      <div style={{ 
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", 
        color: "white", 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 25 
      }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Branch</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{user?.branch || "N/A"}</div>
        <div style={{ marginTop: 10, display: "flex", gap: 30 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Total Employees</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{employees.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Region</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{user?.region || "N/A"}</div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div style={{ display: "flex", gap: 15, marginBottom: 25, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <p>Loading employees...</p>
      ) : employees.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No employees found in your branch.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {employees.map(emp => (
            <EmployeeCard key={emp.empCode} emp={emp} onClick={() => fetchEmpDetails(emp)} />
          ))}
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmp && (
        <EmployeeDetailModal
          emp={selectedEmp}
          details={empDetails}
          loading={detailsLoading}
          dateRange={dateRange}
          onClose={() => setSelectedEmp(null)}
        />
      )}
    </div>
  );
}

/* ============ Employee Card ============ */
function EmployeeCard({ emp, onClick }) {
  const achievedPercent = emp.target > 0 ? Math.min(100, Math.round((emp.achieved || 0) / emp.target * 100)) : 0;
  
  return (
    <div style={empCardStyle} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1f2937" }}>{emp.name}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{emp.empCode}</div>
        </div>
        <div style={{ 
          background: "#dbeafe", 
          color: "#1e40af", 
          padding: "4px 10px", 
          borderRadius: 20, 
          fontSize: 11, 
          fontWeight: 600 
        }}>
          {emp.role}
        </div>
      </div>

      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        📍 {emp.area || "N/A"}
      </div>

      {emp.target > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span>Target Progress</span>
            <span style={{ fontWeight: 600 }}>{achievedPercent}%</span>
          </div>
          <div style={{ background: "#e5e7eb", borderRadius: 10, height: 8, overflow: "hidden" }}>
            <div style={{ 
              width: `${achievedPercent}%`, 
              height: "100%", 
              background: achievedPercent >= 80 ? "#22c55e" : achievedPercent >= 50 ? "#f59e0b" : "#ef4444",
              borderRadius: 10,
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>
      )}

      <button style={viewDetailBtn}>
        📊 View Performance
      </button>
    </div>
  );
}

/* ============ Employee Detail Modal ============ */
function EmployeeDetailModal({ emp, details, loading, dateRange, onClose }) {
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{emp.name}</h2>
            <p style={{ margin: "4px 0 0 0", opacity: 0.9 }}>{emp.empCode} • {emp.area || "N/A"}</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>Loading details...</div>
        ) : details ? (
          <div style={{ padding: 20 }}>
            {/* Period Info */}
            <div style={{ 
              background: "#f3f4f6", 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 20, 
              fontSize: 13, 
              textAlign: "center" 
            }}>
              📅 Period: {dayjs(dateRange.from).format("DD MMM YYYY")} - {dayjs(dateRange.to).format("DD MMM YYYY")}
            </div>

            {/* Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 15, marginBottom: 25 }}>
              <MetricCard label="Attendance" value={`${details.attendancePercent}%`} icon="📅" color="#3b82f6" />
              <MetricCard label="Total Visits" value={details.totalVisits} icon="🚶" color="#8b5cf6" />
              <MetricCard label="External Visits" value={details.externalVisits} icon="🏢" color="#22c55e" />
              <MetricCard label="Internal Visits" value={details.internalVisits} icon="🏠" color="#f59e0b" />
              <MetricCard label="Orders Won" value={details.ordersWon} icon="🏆" color="#ec4899" />
              <MetricCard label="Revenue" value={`₹${(details.totalRevenue || 0).toLocaleString()}`} icon="💰" color="#10b981" />
              <MetricCard label="Samples Assigned" value={details.samplesAssigned} icon="📦" color="#6366f1" />
              <MetricCard label="Samples Used" value={details.samplesUsed} icon="✅" color="#14b8a6" />
            </div>

            {/* Performance Gauge */}
            <div style={{ background: "#f9fafb", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <h4 style={{ marginBottom: 15 }}>Overall Performance</h4>
              <PerformanceGauge 
                attendance={details.attendancePercent} 
                visits={details.totalVisits}
                revenue={details.target > 0 ? (details.totalRevenue / details.target) * 100 : 0}
              />
            </div>

            {/* Target Progress */}
            {details.target > 0 && (
              <div style={{ marginTop: 20, padding: 15, background: "#fef3c7", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>🎯 Target Progress</span>
                  <span>₹{(details.achieved || 0).toLocaleString()} / ₹{details.target.toLocaleString()}</span>
                </div>
                <div style={{ background: "#fde68a", borderRadius: 10, height: 12, overflow: "hidden" }}>
                  <div style={{ 
                    width: `${Math.min(100, (details.achieved / details.target) * 100)}%`, 
                    height: "100%", 
                    background: "#f59e0b",
                    borderRadius: 10 
                  }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No data available</div>
        )}
      </div>
    </div>
  );
}

/* ============ Helper Components ============ */
function MetricCard({ label, value, icon, color }) {
  return (
    <div style={{
      padding: 16,
      background: "white",
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function PerformanceGauge({ attendance, visits, revenue }) {
  const overall = Math.round((attendance * 0.3 + Math.min(100, visits * 2) * 0.3 + Math.min(100, revenue) * 0.4));
  const rating = overall >= 80 ? "Excellent" : overall >= 60 ? "Good" : overall >= 40 ? "Average" : "Needs Improvement";
  const color = overall >= 80 ? "#22c55e" : overall >= 60 ? "#3b82f6" : overall >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <div style={{ 
        width: 100, 
        height: 100, 
        borderRadius: "50%", 
        background: `conic-gradient(${color} ${overall * 3.6}deg, #e5e7eb ${overall * 3.6}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 15px auto",
      }}>
        <div style={{ 
          width: 70, 
          height: 70, 
          borderRadius: "50%", 
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 700,
          color
        }}>
          {overall}%
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color }}>{rating}</div>
    </div>
  );
}

/* ============ Styles ============ */
const inputStyle = {
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
};

const empCardStyle = {
  background: "white",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  cursor: "pointer",
  transition: "all 0.2s ease",
  border: "1px solid #e5e7eb",
};

const viewDetailBtn = {
  width: "100%",
  padding: "10px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
};

const modalContent = {
  background: "white",
  borderRadius: 16,
  maxWidth: 600,
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
};

const modalHeader = {
  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  color: "white",
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  borderRadius: "16px 16px 0 0",
};

const closeBtn = {
  background: "rgba(255,255,255,0.2)",
  border: "none",
  color: "white",
  width: 32,
  height: 32,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 16,
};





