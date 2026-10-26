import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth.jsx";
import dayjs from "dayjs";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

const emptyKpis = {
  totalEmployees: 0,
  presentDays: 0,
  absentDays: 0,
  employeesOnApprovedTour: 0,
  attendanceDays: 0,
  tourDays: 0,
  siteVisits: 0,
  newVisits: 0,
  revisits: 0,
  uniqueCustomers: 0,
  convertedCustomers: 0,
  conversionRate: 0,
  tourExpenses: 0,
  totalRevenue: 0,
};

function monthRange() {
  return {
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD"),
  };
}

export default function PerformanceReview() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [employees, setEmployees] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    regions: [],
    branches: [],
    managers: [],
    employees: [],
  });
  const [filters, setFilters] = useState({
    preset: "month",
    from: monthRange().from,
    to: monthRange().to,
    region: "all",
    branch: "all",
    managerCode: "all",
    empCode: "all",
  });
  const [kpis, setKpis] = useState(emptyKpis);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("empName");
  const [sortDir, setSortDir] = useState("asc");
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }, [token]);

  const fetchFilterOptions = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/performance/filters`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setFilterOptions({
      regions: data.regions || [],
      branches: data.branches || [],
      managers: data.managers || [],
      employees: data.employees || [],
    });
  }, [token]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        region: filters.region,
        branch: filters.branch,
        managerCode: filters.managerCode,
        empCode: filters.empCode,
        page: String(page),
        limit: String(limit),
        sortBy,
        sortDir,
      });
      const res = await fetch(`${API_BASE}/api/performance/overview?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setKpis(data.kpis || emptyKpis);
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Performance overview error:", err);
      setKpis(emptyKpis);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, filters, page, limit, sortBy, sortDir]);

  useEffect(() => {
    if (!token) return;
    fetchUsers();
    fetchFilterOptions();
  }, [token, fetchUsers, fetchFilterOptions]);

  useEffect(() => {
    if (token) fetchOverview();
  }, [token, fetchOverview]);

  const visibleBranches = useMemo(() => {
    if (filters.region === "all") {
      return [...new Set(filterOptions.employees.map((e) => e.branch).filter((b) => b && b !== "-"))];
    }
    return [...new Set(
      filterOptions.employees
        .filter((e) => e.region === filters.region)
        .map((e) => e.branch)
        .filter((b) => b && b !== "-")
    )];
  }, [filterOptions.employees, filters.region]);

  const visibleManagers = useMemo(() => {
    return filterOptions.managers.filter((manager) =>
      filterOptions.employees.some((emp) => {
        if (emp.managerCode !== manager.empCode) return false;
        if (filters.region !== "all" && emp.region !== filters.region) return false;
        if (filters.branch !== "all" && emp.branch !== filters.branch) return false;
        return true;
      })
    );
  }, [filterOptions, filters.region, filters.branch]);

  const visibleEmployees = useMemo(() => {
    return filterOptions.employees.filter((emp) => {
      if (filters.region !== "all" && emp.region !== filters.region) return false;
      if (filters.branch !== "all" && emp.branch !== filters.branch) return false;
      if (filters.managerCode !== "all" && emp.managerCode !== filters.managerCode) return false;
      return true;
    });
  }, [filterOptions.employees, filters.region, filters.branch, filters.managerCode]);

  function applyPreset(preset) {
    if (preset === "today") {
      const today = dayjs().format("YYYY-MM-DD");
      setFilters((prev) => ({ ...prev, preset, from: today, to: today }));
    } else if (preset === "month") {
      setFilters((prev) => ({ ...prev, preset, ...monthRange() }));
    } else {
      setFilters((prev) => ({ ...prev, preset }));
    }
    setPage(1);
  }

  function updateFilter(key, value) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "region") {
        next.branch = "all";
        next.managerCode = "all";
        next.empCode = "all";
      }
      if (key === "branch") {
        next.managerCode = "all";
        next.empCode = "all";
      }
      if (key === "managerCode") next.empCode = "all";
      return next;
    });
    setPage(1);
  }

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "empName" ? "asc" : "desc");
    }
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⭐ Performance Review</h2>
        <button onClick={fetchOverview} style={refreshBtn}>🔄 Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 25 }}>
        <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} label="📊 Performance Overview" />
        <TabButton active={activeTab === "targets"} onClick={() => setActiveTab("targets")} label="🎯 Target Management" isLast />
      </div>

      {activeTab === "overview" && (
        <div>
          <div style={filterContainer}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
              <FilterField label="Period">
                <select value={filters.preset} onChange={(e) => applyPreset(e.target.value)} style={selectStyle}>
                  <option value="today">Today</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </FilterField>
              <FilterField label="From">
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, preset: "custom", from: e.target.value }));
                    setPage(1);
                  }}
                  style={selectStyle}
                />
              </FilterField>
              <FilterField label="To">
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, preset: "custom", to: e.target.value }));
                    setPage(1);
                  }}
                  style={selectStyle}
                />
              </FilterField>
              <FilterField label="Region">
                <select value={filters.region} onChange={(e) => updateFilter("region", e.target.value)} style={selectStyle}>
                  <option value="all">All India</option>
                  {filterOptions.regions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Branch">
                <select value={filters.branch} onChange={(e) => updateFilter("branch", e.target.value)} style={selectStyle}>
                  <option value="all">All Branches</option>
                  {visibleBranches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Manager">
                <select value={filters.managerCode} onChange={(e) => updateFilter("managerCode", e.target.value)} style={selectStyle}>
                  <option value="all">All Managers</option>
                  {visibleManagers.map((manager) => (
                    <option key={manager.empCode} value={manager.empCode}>{manager.name}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Employee">
                <select value={filters.empCode} onChange={(e) => updateFilter("empCode", e.target.value)} style={selectStyle}>
                  <option value="all">All Employees</option>
                  {visibleEmployees.map((emp) => (
                    <option key={emp.empCode} value={emp.empCode}>{emp.name} ({emp.empCode})</option>
                  ))}
                </select>
              </FilterField>
            </div>
          </div>

          <div style={kpiGrid}>
            <KpiCard label="Total Employees" value={kpis.totalEmployees} icon="👥" color="#3b82f6" />
            <KpiCard label="Present / Absent" value={`${kpis.presentDays} / ${kpis.absentDays}`} icon="📅" color="#10b981" />
            <KpiCard label="Employees on Approved Tour" value={kpis.employeesOnApprovedTour} icon="✈️" color="#0ea5e9" />
            <KpiCard label="Attendance / Tour Days" value={`${kpis.attendanceDays} / ${kpis.tourDays}`} icon="🗓️" color="#6366f1" />
            <KpiCard label="Site Visits" value={kpis.siteVisits} icon="📍" color="#8b5cf6" />
            <KpiCard label="New Visits / Revisits" value={`${kpis.newVisits} / ${kpis.revisits}`} icon="🔁" color="#a855f7" />
            <KpiCard label="Unique Customers" value={kpis.uniqueCustomers} icon="👤" color="#14b8a6" />
            <KpiCard label="Converted Customers" value={kpis.convertedCustomers} icon="✅" color="#22c55e" />
            <KpiCard label="Conversion Rate" value={`${kpis.conversionRate || 0}%`} icon="📈" color="#84cc16" />
            <KpiCard label="Tour Expenses" value={`₹${Number(kpis.tourExpenses || 0).toLocaleString()}`} icon="🧾" color="#f59e0b" />
            <KpiCard label="Total Revenue" value={`₹${Number(kpis.totalRevenue || 0).toLocaleString()}`} icon="💰" color="#16a34a" />
          </div>

          <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <Th onClick={() => toggleSort("empCode")} label="Employee Code" />
                  <Th onClick={() => toggleSort("empName")} label="Employee Name" />
                  <Th onClick={() => toggleSort("region")} label="Region / Branch" />
                  <Th onClick={() => toggleSort("managerName")} label="Manager" />
                  <th style={thStyle}>Attendance</th>
                  <Th onClick={() => toggleSort("tourDays")} label="Tour Days" />
                  <Th onClick={() => toggleSort("tourRequests")} label="Tour Requests" />
                  <Th onClick={() => toggleSort("siteVisits")} label="Total Site Visits" />
                  <Th onClick={() => toggleSort("newVisits")} label="New Visits" />
                  <Th onClick={() => toggleSort("revisits")} label="Revisits" />
                  <Th onClick={() => toggleSort("uniqueCustomers")} label="Unique Customers" />
                  <Th onClick={() => toggleSort("convertedCustomers")} label="Converted Customers" />
                  <Th onClick={() => toggleSort("tourExpenses")} label="Tour Expenses" />
                  <Th onClick={() => toggleSort("totalRevenue")} label="Total Revenue" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} style={tdStyle}>Loading performance...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={14} style={tdStyle}>No employees found for the selected filters.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.empCode}
                      onClick={() => setSelectedEmp(row)}
                      style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}
                    >
                      <td style={tdStyle}>{row.empCode}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: "#1d4ed8" }}>{row.empName}</td>
                      <td style={tdStyle}>{row.region} / {row.branch}</td>
                      <td style={tdStyle}>{row.managerName || "-"}</td>
                      <td style={tdStyle}>{row.attendanceLabel || "Unknown"}</td>
                      <td style={tdStyle}>{row.tourDays || 0}</td>
                      <td style={tdStyle}>{row.tourRequests || 0}{row.tourApproved ? ` (${row.tourApproved} approved)` : ""}</td>
                      <td style={tdStyle}>{row.siteVisits || 0}</td>
                      <td style={tdStyle}>{row.newVisits || 0}</td>
                      <td style={tdStyle}>{row.revisits || 0}</td>
                      <td style={tdStyle}>{row.uniqueCustomers || 0}</td>
                      <td style={tdStyle}>{row.convertedCustomers || 0}</td>
                      <td style={tdStyle}>₹{Number(row.tourExpenses || 0).toLocaleString()}</td>
                      <td style={tdStyle}>₹{Number(row.totalRevenue || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={pager}>
            <span>Showing {rows.length} of {total}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>Prev</button>
              <span style={{ padding: "8px 10px" }}>{page} / {pageCount}</span>
              <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} style={pageBtn}>Next</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "targets" && (
        <TargetManagement
          employees={employees.filter((e) => e.role === "Employee")}
          token={token}
          onUpdate={fetchUsers}
        />
      )}

      {selectedEmp && (
        <EmployeeDetailPanel
          emp={selectedEmp}
          token={token}
          initialRange={{ from: filters.from, to: filters.to }}
          onClose={() => setSelectedEmp(null)}
        />
      )}
    </div>
  );
}

function EmployeeDetailPanel({ emp, token, initialRange, onClose }) {
  const [range, setRange] = useState(initialRange);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/performance/employee/${emp.empCode}?from=${range.from}&to=${range.to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setDetails(res.ok ? data : null);
    } catch (err) {
      console.error("Employee performance error:", err);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [emp.empCode, range.from, range.to, token]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const profile = details?.profile || emp;
  const calendar = details?.attendance?.calendar || [];

  return (
    <div style={drawerOverlay} onClick={onClose}>
      <aside style={drawer} onClick={(e) => e.stopPropagation()}>
        <div style={drawerHeader}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.name || emp.empName}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {profile.empCode} • {profile.region || emp.region} • {profile.branch || emp.branch}
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", height: "calc(100% - 72px)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input type="date" value={range.from} onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))} style={selectStyle} />
            <input type="date" value={range.to} onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))} style={selectStyle} />
          </div>

          {loading ? (
            <p>Loading employee details...</p>
          ) : !details ? (
            <p>Unable to load details for this employee.</p>
          ) : (
            <>
              <Section title="Employee Profile">
                <p>Code: {details.profile.empCode}</p>
                <p>Manager: {details.profile.managerName || "-"}</p>
                <p>Region / Branch: {details.profile.region} / {details.profile.branch}</p>
              </Section>

              <Section title="Attendance Calendar">
                <p style={{ fontSize: 12, color: "#64748b" }}>
                  P {details.attendance.summary.P} · HD {details.attendance.summary.HD} · A {details.attendance.summary.A} · L {details.attendance.summary.L}
                </p>
                <div style={calGrid}>
                  {calendar.map((day) => (
                    <div key={day.date} title={day.holidayName || day.status} style={calCell(day.status)}>
                      <div>{dayjs(day.date).format("DD")}</div>
                      <div>{day.status}</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Tour Details">
                {details.tours.length === 0 ? <p>No tours in this period.</p> : details.tours.map((tour) => (
                  <div key={tour.id} style={miniCard}>
                    <div><strong>{tour.toLocation}</strong> • {tour.status}</div>
                    <div>Date: {tour.requestDate || "Unknown"} {tour.approvedDate ? `• Approved: ${tour.approvedDate}` : ""}</div>
                    <div>{tour.purpose}</div>
                  </div>
                ))}
              </Section>

              <Section title="Tour Expenses">
                {details.tours.filter((t) => t.expensesFilled).length === 0 ? (
                  <p>No submitted tour expenses in this period.</p>
                ) : details.tours.filter((t) => t.expensesFilled).map((tour) => (
                  <div key={`${tour.id}-exp`} style={miniCard}>
                    <div>Submitted: ₹{Number(tour.submittedAmount || 0).toLocaleString()}</div>
                    <div>Travel ₹{tour.travelExpense} · Food ₹{tour.foodExpense} · Stay ₹{tour.accommodationExpense}</div>
                    <div>Reimbursed: {tour.reimbursed ? `Yes (${tour.reimbursedDate || "-"})` : "No"}</div>
                  </div>
                ))}
              </Section>

              <Section title="Site Visit Details">
                {details.visits.length === 0 ? <p>No qualifying site visits in this period.</p> : details.visits.map((visit, idx) => (
                  <div key={`${visit.customerId}-${idx}`} style={miniCard}>
                    <div>{visit.date} • {visit.visitType}</div>
                    <div>{visit.customerId} • {visit.customerName}</div>
                    <div>Report: {visit.status}</div>
                  </div>
                ))}
              </Section>

              <Section title="Customer Conversion">
                {details.conversions.length === 0 ? (
                  <p>No conversion evidence in Daily Tracker revenue for this period.</p>
                ) : details.conversions.map((item, idx) => (
                  <div key={`${item.customerId}-${idx}`} style={miniCard}>
                    <div>{item.date} • {item.customerId} • {item.customerName}</div>
                    <div>₹{Number(item.orderValue || 0).toLocaleString()} {item.poNumber && item.poNumber !== "-" ? `• PO ${item.poNumber}` : ""}</div>
                  </div>
                ))}
              </Section>

              <Section title="Revenue Details">
                <p><strong>Total: ₹{Number(details.revenue.total || 0).toLocaleString()}</strong></p>
                {details.revenue.entries.length === 0 ? <p>No Daily Tracker revenue entries.</p> : details.revenue.entries.map((item, idx) => (
                  <div key={`${item.date}-${idx}`} style={miniCard}>
                    <div>{item.date} • {item.customerName}</div>
                    <div>₹{Number(item.orderValue || 0).toLocaleString()}</div>
                  </div>
                ))}
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function TargetManagement({ employees, token, onUpdate }) {
  const [targets, setTargets] = useState({});
  const [saving, setSaving] = useState(false);
  const [filterBranch, setFilterBranch] = useState("all");

  useEffect(() => {
    const initial = {};
    employees.forEach((emp) => {
      initial[emp.empCode] = emp.target || 0;
    });
    setTargets(initial);
  }, [employees]);

  const branches = [...new Set(employees.map((e) => e.branch).filter(Boolean))];
  const filteredEmps = filterBranch === "all" ? employees : employees.filter((e) => e.branch === filterBranch);

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
      if (res.ok) onUpdate();
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
      await fetch(`${API_BASE}/api/users/bulk-targets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targets: updates }),
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 15 }}>
        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} style={selectStyle}>
            <option value="all">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <span style={{ color: "#6b7280" }}>{filteredEmps.length} employees</span>
        </div>
        <button onClick={saveAllTargets} disabled={saving} style={saveAllBtn}>
          {saving ? "Saving..." : "💾 Save All Targets"}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Branch</th>
              <th style={thStyle}>Current Target (₹)</th>
              <th style={thStyle}>Set New Target (₹)</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map((emp) => (
              <tr key={emp.empCode} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={tdStyle}><div style={{ fontWeight: 600 }}>{emp.name}</div><div style={{ fontSize: 12, color: "#6b7280" }}>{emp.empCode}</div></td>
                <td style={tdStyle}>{emp.branch || "-"}</td>
                <td style={tdStyle}>₹{(emp.target || 0).toLocaleString()}</td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    value={targets[emp.empCode] || ""}
                    onChange={(e) => setTargets({ ...targets, [emp.empCode]: e.target.value })}
                    style={targetInput}
                  />
                </td>
                <td style={tdStyle}>
                  <button onClick={() => saveTarget(emp.empCode)} disabled={saving} style={saveBtnSmall}>Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

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

function KpiCard({ label, value, icon, color }) {
  return (
    <div style={{ padding: 14, background: "white", borderRadius: 12, borderLeft: `4px solid ${color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function Th({ label, onClick }) {
  return (
    <th style={{ ...thStyle, cursor: "pointer" }} onClick={onClick}>{label}</th>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>{title}</h4>
      <div style={{ fontSize: 13, color: "#334155" }}>{children}</div>
    </div>
  );
}

const filterContainer = {
  background: "#f8fafc",
  padding: 16,
  borderRadius: 12,
  marginBottom: 20,
  border: "1px solid #e2e8f0",
};
const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 };
const selectStyle = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, minWidth: 140 };
const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 1200 };
const thStyle = { padding: "12px 10px", textAlign: "left", fontWeight: 600, borderBottom: "2px solid #e5e7eb", fontSize: 12, whiteSpace: "nowrap" };
const tdStyle = { padding: "12px 10px", fontSize: 13, whiteSpace: "nowrap" };
const pager = { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 };
const pageBtn = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };
const refreshBtn = { padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500 };
const targetInput = { padding: "8px 12px", border: "2px solid #3b82f6", borderRadius: 6, fontSize: 14, width: 120 };
const saveBtnSmall = { padding: "6px 14px", background: "#22c55e", color: "white", border: "none", borderRadius: 6, cursor: "pointer" };
const saveAllBtn = { padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 };
const drawerOverlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 80, display: "flex", justifyContent: "flex-end" };
const drawer = { width: "min(460px, 100%)", height: "100%", background: "#fff", boxShadow: "-8px 0 24px rgba(0,0,0,0.15)" };
const drawerHeader = { background: "#1d4ed8", color: "#fff", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" };
const closeBtn = { background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer" };
const miniCard = { padding: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8 };
const calGrid = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 };
const calCell = (status) => ({
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: 4,
  textAlign: "center",
  fontSize: 10,
  background: status === "P" ? "#dcfce7" : status === "A" ? "#fee2e2" : status === "HD" ? "#fef3c7" : status === "L" ? "#dbeafe" : "#f8fafc",
});
