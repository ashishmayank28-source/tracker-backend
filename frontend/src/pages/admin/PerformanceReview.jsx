import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth.jsx";
import dayjs from "dayjs";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function PerformanceReview() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // overview, targets
  const [employees, setEmployees] = useState([]);
  const [regions, setRegions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD"),
  });

  // Selected employee for detail view
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empDetails, setEmpDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fetch all employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const emps = Array.isArray(data) ? data : [];
      setEmployees(emps);
      
      // Extract unique regions and branches
      const uniqueRegions = [...new Set(emps.map(e => e.region).filter(Boolean))];
      const uniqueBranches = [...new Set(emps.map(e => e.branch).filter(Boolean))];
      setRegions(uniqueRegions);
      setBranches(uniqueBranches);
    } catch (err) {
      console.error("Fetch employees error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchEmployees();
  }, [token, fetchEmployees]);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    if (emp.role !== "Employee") return false;
    if (selectedRegion !== "all" && emp.region !== selectedRegion) return false;
    if (selectedBranch !== "all" && emp.branch !== selectedBranch) return false;
    return true;
  });

  // Fetch employee details
  async function fetchEmpDetails(emp) {
    setSelectedEmp(emp);
    setDetailsLoading(true);
    
    try {
      const { from, to } = dateRange;
      
      // Fetch attendance data
      const attendanceRes = await fetch(
        `${API_BASE}/api/customers/reports-by-emp/${emp.empCode}?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const attendance = await attendanceRes.json();
      
      // Fetch revenue data
      const revenueRes = await fetch(
        `${API_BASE}/api/customers/my-reports?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const revenue = await revenueRes.json();

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
      const internalMeetings = reports.filter(r => r.meetingType === "Internal").length;
      const leaveCount = reports.filter(r => r.meetingType === "Leave").length;
      
      // Calculate working days and attendance
      const startDate = dayjs(from);
      const endDate = dayjs(to);
      let workingDays = 0;
      let current = startDate;
      while (current.isBefore(endDate) || current.isSame(endDate, "day")) {
        if (current.day() !== 0) workingDays++; // Exclude Sundays
        current = current.add(1, "day");
      }
      
      // Days with activity
      const activeDays = new Set(reports.map(r => dayjs(r.date).format("YYYY-MM-DD"))).size;
      const attendancePercent = workingDays > 0 ? Math.round((activeDays / workingDays) * 100) : 0;

      // Revenue calculation (mock - actual would need proper API)
      const orderWonVisits = reports.filter(r => r.orderStatus === "Won" || r.orderValue);
      const totalRevenue = orderWonVisits.reduce((sum, r) => sum + (r.orderValue || 0), 0);

      setEmpDetails({
        totalVisits,
        externalVisits,
        internalMeetings,
        leaveCount,
        workingDays,
        activeDays,
        attendancePercent,
        totalRevenue,
        target: emp.target || 0,
        achieved: totalRevenue,
        reports,
        samplesAssigned,
        samplesUsed,
      });
    } catch (err) {
      console.error("Fetch emp details error:", err);
      setEmpDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  // Calculate region/branch performance
  function getGroupPerformance(group, type) {
    const groupEmps = employees.filter(e => 
      e.role === "Employee" && (type === "region" ? e.region === group : e.branch === group)
    );
    return {
      name: group,
      empCount: groupEmps.length,
      totalTarget: groupEmps.reduce((sum, e) => sum + (e.target || 0), 0),
      // More metrics would come from actual API calls
    };
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 25 }}>
        <TabButton 
          active={activeTab === "overview"} 
          onClick={() => setActiveTab("overview")}
          label="📊 Performance Overview"
        />
        <TabButton 
          active={activeTab === "targets"} 
          onClick={() => setActiveTab("targets")}
          label="🎯 Target Management"
          isLast
        />
      </div>

      {/* Performance Overview Tab */}
      {activeTab === "overview" && (
        <div>
          {/* Filters */}
          <div style={filterContainer}>
            <div style={{ display: "flex", gap: 15, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <label style={labelStyle}>Region</label>
                <select 
                  value={selectedRegion} 
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">All Regions</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Branch</label>
                <select 
                  value={selectedBranch} 
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>From</label>
                <input 
                  type="date" 
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  style={selectStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>To</label>
                <input 
                  type="date" 
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  style={selectStyle}
                />
              </div>
            </div>
          </div>

          {/* Region-wise Summary Cards */}
          {selectedRegion === "all" && (
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ marginBottom: 15 }}>🌍 Region-wise Performance</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 15 }}>
                {regions.map(region => {
                  const regionEmps = employees.filter(e => e.role === "Employee" && e.region === region);
                  return (
                    <div 
                      key={region} 
                      style={regionCard}
                      onClick={() => setSelectedRegion(region)}
                    >
                      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Region</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1e40af", marginBottom: 12 }}>{region}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                        <div>👥 Employees:</div>
                        <div style={{ fontWeight: 600 }}>{regionEmps.length}</div>
                        <div>🎯 Total Target:</div>
                        <div style={{ fontWeight: 600 }}>₹{regionEmps.reduce((s, e) => s + (e.target || 0), 0).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Branch-wise Summary Cards */}
          {selectedBranch === "all" && selectedRegion !== "all" && (
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ marginBottom: 15 }}>🏢 Branch-wise Performance ({selectedRegion})</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 15 }}>
                {branches
                  .filter(b => employees.some(e => e.branch === b && e.region === selectedRegion))
                  .map(branch => {
                    const branchEmps = employees.filter(e => e.role === "Employee" && e.branch === branch && e.region === selectedRegion);
                    return (
                      <div 
                        key={branch} 
                        style={{ ...regionCard, borderColor: "#22c55e" }}
                        onClick={() => setSelectedBranch(branch)}
                      >
                        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Branch</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#166534", marginBottom: 12 }}>{branch}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                          <div>👥 Employees:</div>
                          <div style={{ fontWeight: 600 }}>{branchEmps.length}</div>
                          <div>🎯 Total Target:</div>
                          <div style={{ fontWeight: 600 }}>₹{branchEmps.reduce((s, e) => s + (e.target || 0), 0).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Employee List */}
          <div>
            <h3 style={{ marginBottom: 15 }}>
              👥 Employee Performance 
              <span style={{ fontWeight: 400, fontSize: 14, color: "#6b7280", marginLeft: 10 }}>
                ({filteredEmployees.length} employees)
              </span>
            </h3>
            
            {loading ? (
              <p>Loading employees...</p>
            ) : filteredEmployees.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No employees found for selected filters.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 15 }}>
                {filteredEmployees.map(emp => (
                  <EmployeeCard 
                    key={emp.empCode} 
                    emp={emp} 
                    onClick={() => fetchEmpDetails(emp)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target Management Tab */}
      {activeTab === "targets" && (
        <TargetManagement 
          employees={employees.filter(e => e.role === "Employee")}
          token={token}
          onUpdate={fetchEmployees}
        />
      )}

      {/* Employee Detail Modal */}
      {selectedEmp && (
        <EmployeeDetailModal
          emp={selectedEmp}
          details={empDetails}
          loading={detailsLoading}
          dateRange={dateRange}
          onClose={() => { setSelectedEmp(null); setEmpDetails(null); }}
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
          fontWeight: 600,
        }}>
          {emp.role}
        </div>
      </div>
      
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        📍 {emp.branch || "N/A"} • {emp.region || "N/A"}
      </div>

      {/* Target Progress */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <span>Target Achievement</span>
          <span style={{ fontWeight: 600 }}>{achievedPercent}%</span>
        </div>
        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ 
            height: "100%", 
            width: `${achievedPercent}%`,
            background: achievedPercent >= 80 ? "#22c55e" : achievedPercent >= 50 ? "#f59e0b" : "#ef4444",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginTop: 4 }}>
          <span>₹{(emp.achieved || 0).toLocaleString()}</span>
          <span>₹{(emp.target || 0).toLocaleString()}</span>
        </div>
      </div>

      <button style={viewDetailBtn}>
        📊 View Details
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
            <p style={{ margin: "4px 0 0 0", opacity: 0.9 }}>{emp.empCode} • {emp.branch} • {emp.region}</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>Loading details...</div>
        ) : details ? (
          <div style={{ padding: 20 }}>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 15, marginBottom: 25 }}>
              <MetricCard label="Attendance" value={`${details.attendancePercent}%`} icon="📅" color="#3b82f6" />
              <MetricCard label="Total Visits" value={details.totalVisits} icon="📍" color="#8b5cf6" />
              <MetricCard label="Revenue" value={`₹${details.totalRevenue.toLocaleString()}`} icon="💰" color="#22c55e" />
              <MetricCard label="Target" value={`₹${(emp.target || 0).toLocaleString()}`} icon="🎯" color="#f59e0b" />
              <MetricCard label="Samples Used" value={`${details.samplesUsed || 0}/${details.samplesAssigned || 0}`} icon="📦" color="#ec4899" />
            </div>

            {/* Detailed Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {/* Attendance Section */}
              <div style={sectionCard}>
                <h4 style={sectionTitle}>📅 Attendance Summary</h4>
                <div style={statsGrid}>
                  <StatRow label="Working Days" value={details.workingDays} />
                  <StatRow label="Days Present" value={details.activeDays} />
                  <StatRow label="Leaves Taken" value={details.leaveCount} />
                  <StatRow label="Attendance %" value={`${details.attendancePercent}%`} highlight />
                </div>
              </div>

              {/* Visits Section */}
              <div style={sectionCard}>
                <h4 style={sectionTitle}>📍 Visit Summary</h4>
                <div style={statsGrid}>
                  <StatRow label="External Visits" value={details.externalVisits} />
                  <StatRow label="Internal Meetings" value={details.internalMeetings} />
                  <StatRow label="Total Activities" value={details.totalVisits} highlight />
                  <StatRow label="Avg Visits/Day" value={(details.activeDays > 0 ? (details.totalVisits / details.activeDays).toFixed(1) : 0)} />
                </div>
              </div>

              {/* Sample Boards Section */}
              <div style={{ ...sectionCard, background: "#fdf4ff", borderColor: "#f0abfc" }}>
                <h4 style={sectionTitle}>📦 Sample Boards</h4>
                <div style={statsGrid}>
                  <StatRow label="Total Assigned" value={details.samplesAssigned || 0} />
                  <StatRow label="Used" value={details.samplesUsed || 0} />
                  <StatRow label="Available" value={(details.samplesAssigned || 0) - (details.samplesUsed || 0)} />
                  <StatRow 
                    label="Usage %" 
                    value={`${details.samplesAssigned > 0 ? Math.round((details.samplesUsed / details.samplesAssigned) * 100) : 0}%`} 
                    highlight 
                  />
                </div>
              </div>

              {/* Revenue Section */}
              <div style={sectionCard}>
                <h4 style={sectionTitle}>💰 Revenue Summary</h4>
                <div style={statsGrid}>
                  <StatRow label="Target" value={`₹${(emp.target || 0).toLocaleString()}`} />
                  <StatRow label="Achieved" value={`₹${details.totalRevenue.toLocaleString()}`} />
                  <StatRow label="Balance" value={`₹${((emp.target || 0) - details.totalRevenue).toLocaleString()}`} />
                  <StatRow 
                    label="Achievement %" 
                    value={`${emp.target > 0 ? Math.round((details.totalRevenue / emp.target) * 100) : 0}%`} 
                    highlight 
                  />
                </div>
              </div>

              {/* Performance Rating */}
              <div style={{ ...sectionCard, gridColumn: "span 2" }}>
                <h4 style={sectionTitle}>⭐ Performance Rating</h4>
                <PerformanceGauge 
                  attendance={details.attendancePercent}
                  visits={details.totalVisits}
                  revenue={emp.target > 0 ? (details.totalRevenue / emp.target) * 100 : 0}
                />
              </div>
            </div>

            {/* Period Info */}
            <div style={{ marginTop: 20, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#6b7280" }}>
              📆 Period: {dayjs(dateRange.from).format("DD MMM YYYY")} - {dayjs(dateRange.to).format("DD MMM YYYY")}
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            Unable to load details. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ Target Management ============ */
function TargetManagement({ employees, token, onUpdate }) {
  const [targets, setTargets] = useState({});
  const [saving, setSaving] = useState(false);
  const [filterBranch, setFilterBranch] = useState("all");

  useEffect(() => {
    // Initialize targets from employees
    const initial = {};
    employees.forEach(emp => {
      initial[emp.empCode] = emp.target || 0;
    });
    setTargets(initial);
  }, [employees]);

  const branches = [...new Set(employees.map(e => e.branch).filter(Boolean))];
  const filteredEmps = filterBranch === "all" 
    ? employees 
    : employees.filter(e => e.branch === filterBranch);

  async function saveTarget(empCode) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/${empCode}/target`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target: Number(targets[empCode]) || 0 }),
      });
      
      if (res.ok) {
        alert("✅ Target updated successfully!");
        onUpdate();
      } else {
        alert("❌ Failed to update target");
      }
    } catch (err) {
      console.error("Save target error:", err);
      alert("❌ Error saving target");
    } finally {
      setSaving(false);
    }
  }

  async function saveAllTargets() {
    setSaving(true);
    try {
      const updates = Object.entries(targets).map(([empCode, target]) => ({
        empCode,
        target: Number(target) || 0,
      }));

      const res = await fetch(`${API_BASE}/api/users/bulk-targets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targets: updates }),
      });
      
      if (res.ok) {
        alert("✅ All targets updated successfully!");
        onUpdate();
      } else {
        alert("❌ Failed to update targets");
      }
    } catch (err) {
      console.error("Save all targets error:", err);
      alert("❌ Error saving targets");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 15 }}>
        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          <select 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <span style={{ color: "#6b7280" }}>{filteredEmps.length} employees</span>
        </div>
        <button onClick={saveAllTargets} disabled={saving} style={saveAllBtn}>
          {saving ? "Saving..." : "💾 Save All Targets"}
        </button>
      </div>

      {/* Target Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Branch</th>
              <th style={thStyle}>Region</th>
              <th style={thStyle}>Current Target (₹)</th>
              <th style={thStyle}>Set New Target (₹)</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map((emp, idx) => (
              <tr key={emp.empCode} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={tdStyle}>{idx + 1}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{emp.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{emp.empCode}</div>
                </td>
                <td style={tdStyle}>{emp.branch || "-"}</td>
                <td style={tdStyle}>{emp.region || "-"}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#3b82f6" }}>
                  ₹{(emp.target || 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    value={targets[emp.empCode] || ""}
                    onChange={(e) => setTargets({ ...targets, [emp.empCode]: e.target.value })}
                    style={targetInput}
                    placeholder="Enter target"
                  />
                </td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => saveTarget(emp.empCode)} 
                    disabled={saving}
                    style={saveBtnSmall}
                  >
                    💾 Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Helper Components ============ */
function TabButton({ active, onClick, label, isLast }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 24px",
        background: active ? "#3b82f6" : "#e5e7eb",
        color: active ? "white" : "#374151",
        border: "none",
        borderRadius: isLast ? "0 8px 8px 0" : "8px 0 0 8px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {label}
    </button>
  );
}

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
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <>
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ fontWeight: highlight ? 700 : 600, color: highlight ? "#1e40af" : "#1f2937" }}>{value}</div>
    </>
  );
}

function PerformanceGauge({ attendance, visits, revenue }) {
  const overall = Math.round((attendance * 0.3 + Math.min(100, visits * 2) * 0.3 + Math.min(100, revenue) * 0.4));
  const rating = overall >= 80 ? "Excellent" : overall >= 60 ? "Good" : overall >= 40 ? "Average" : "Needs Improvement";
  const color = overall >= 80 ? "#22c55e" : overall >= 60 ? "#3b82f6" : overall >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
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
          width: 80, 
          height: 80, 
          borderRadius: "50%", 
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color }}>{overall}%</div>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color }}>{rating}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Overall Performance</div>
    </div>
  );
}

/* ============ Styles ============ */
const filterContainer = {
  background: "#f8fafc",
  padding: 20,
  borderRadius: 12,
  marginBottom: 25,
  border: "1px solid #e2e8f0",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  marginBottom: 4,
};

const selectStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
  minWidth: 140,
};

const regionCard = {
  padding: 20,
  background: "white",
  borderRadius: 12,
  border: "2px solid #3b82f6",
  cursor: "pointer",
  transition: "all 0.2s",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const empCardStyle = {
  padding: 20,
  background: "white",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  cursor: "pointer",
  transition: "all 0.2s",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const viewDetailBtn = {
  width: "100%",
  marginTop: 15,
  padding: "10px",
  background: "#f1f5f9",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  color: "#3b82f6",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100,
  padding: 20,
};

const modalContent = {
  background: "white",
  borderRadius: 16,
  width: "95%",
  maxWidth: 900,
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
};

const modalHeader = {
  background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
  color: "white",
  padding: "20px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const closeBtn = {
  background: "rgba(255,255,255,0.2)",
  border: "none",
  color: "white",
  width: 36,
  height: 36,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 18,
};

const sectionCard = {
  background: "#f8fafc",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

const sectionTitle = {
  margin: "0 0 12px 0",
  fontSize: 14,
  fontWeight: 600,
  color: "#374151",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 16px",
  fontSize: 14,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const thStyle = {
  padding: "14px 16px",
  textAlign: "left",
  fontWeight: 600,
  borderBottom: "2px solid #e5e7eb",
  fontSize: 13,
};

const tdStyle = {
  padding: "14px 16px",
  fontSize: 14,
};

const targetInput = {
  padding: "8px 12px",
  border: "2px solid #3b82f6",
  borderRadius: 6,
  fontSize: 14,
  width: 120,
};

const saveBtnSmall = {
  padding: "6px 14px",
  background: "#22c55e",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 13,
};

const saveAllBtn = {
  padding: "10px 20px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

