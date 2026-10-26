import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth.jsx";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

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

const VIEWS_KEY = "performanceTableViews";
const emptyColumnFilters = {
  empCode: "",
  empName: "",
  regionBranch: "",
  managerName: "",
  attendance: "",
  tourDays: "",
  tourRequests: "",
  siteVisits: "",
  newVisits: "",
  revisits: "",
  uniqueCustomers: "",
  convertedCustomers: "",
  tourExpenses: "",
  totalRevenue: "",
};

function monthRange() {
  return {
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD"),
  };
}

function readSharedState() {
  try {
    const raw = new URLSearchParams(window.location.search).get("pf");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function matchText(value, expr) {
  const needle = String(expr || "").trim().toLowerCase();
  if (!needle) return true;
  return String(value || "").toLowerCase().includes(needle);
}

function matchNumber(value, expr) {
  const raw = String(expr || "").trim();
  if (!raw) return true;
  const n = Number(value) || 0;
  const range = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (range) return n >= Number(range[1]) && n <= Number(range[2]);
  const op = raw.match(/^(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/);
  if (op) {
    const cmp = Number(op[2]);
    switch (op[1] || "=") {
      case ">": return n > cmp;
      case "<": return n < cmp;
      case ">=": return n >= cmp;
      case "<=": return n <= cmp;
      default: return n === cmp;
    }
  }
  return String(value ?? "").includes(raw);
}

function loadSavedViews() {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PerformanceReview() {
  const { token } = useAuth();
  const shared = readSharedState();
  const [activeTab, setActiveTab] = useState("overview");
  const [employees, setEmployees] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    regions: [],
    branches: [],
    managers: [],
    employees: [],
  });
  const [filters, setFilters] = useState({
    preset: shared?.filters?.preset || "month",
    from: shared?.filters?.from || monthRange().from,
    to: shared?.filters?.to || monthRange().to,
    region: shared?.filters?.region || "all",
    branch: shared?.filters?.branch || "all",
    managerCode: shared?.filters?.managerCode || "all",
    empCode: shared?.filters?.empCode || "all",
  });
  const [columnFilters, setColumnFilters] = useState({
    ...emptyColumnFilters,
    ...(shared?.columnFilters || {}),
  });
  const [kpis, setKpis] = useState(emptyKpis);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [sortBy, setSortBy] = useState(shared?.sortBy || "empName");
  const [sortDir, setSortDir] = useState(shared?.sortDir || "asc");
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [savedViews, setSavedViews] = useState(loadSavedViews);
  const [selectedView, setSelectedView] = useState("");
  const [actionMessage, setActionMessage] = useState("");

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
        page: "1",
        limit: "2000",
        sortBy,
        sortDir,
      });
      const res = await fetch(`${API_BASE}/api/performance/overview?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setKpis(data.kpis || emptyKpis);
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      console.error("Performance overview error:", err);
      setKpis(emptyKpis);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, filters, sortBy, sortDir]);

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

  function updateColumnFilter(key, value) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const filteredRows = useMemo(() => rows.filter((row) => {
    const regionBranch = `${row.region || ""} / ${row.branch || ""}`;
    return (
      matchText(row.empCode, columnFilters.empCode) &&
      matchText(row.empName, columnFilters.empName) &&
      matchText(regionBranch, columnFilters.regionBranch) &&
      matchText(row.managerName, columnFilters.managerName) &&
      matchText(row.attendanceLabel || "Unknown", columnFilters.attendance) &&
      matchNumber(row.tourDays, columnFilters.tourDays) &&
      matchNumber(row.tourRequests, columnFilters.tourRequests) &&
      matchNumber(row.siteVisits, columnFilters.siteVisits) &&
      matchNumber(row.newVisits, columnFilters.newVisits) &&
      matchNumber(row.revisits, columnFilters.revisits) &&
      matchNumber(row.uniqueCustomers, columnFilters.uniqueCustomers) &&
      matchNumber(row.convertedCustomers, columnFilters.convertedCustomers) &&
      matchNumber(row.tourExpenses, columnFilters.tourExpenses) &&
      matchNumber(row.totalRevenue, columnFilters.totalRevenue)
    );
  }), [rows, columnFilters]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / limit));
  const safePage = Math.min(page, pageCount);
  const pagedRows = filteredRows.slice((safePage - 1) * limit, safePage * limit);
  const hasColumnFilters = Object.values(columnFilters).some((value) => String(value || "").trim());

  function currentViewState() {
    return { filters, columnFilters, sortBy, sortDir };
  }

  function saveView() {
    const name = window.prompt("Save this view as");
    if (!name?.trim()) return;
    const next = [
      {
        id: String(Date.now()),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        ...currentViewState(),
      },
      ...savedViews,
    ].slice(0, 20);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    setSavedViews(next);
    setSelectedView(next[0].id);
    setActionMessage("View saved on this browser.");
  }

  function applyView(id) {
    setSelectedView(id);
    const view = savedViews.find((item) => item.id === id);
    if (!view) return;
    setFilters({
      preset: "month",
      from: monthRange().from,
      to: monthRange().to,
      region: "all",
      branch: "all",
      managerCode: "all",
      empCode: "all",
      ...(view.filters || {}),
    });
    setColumnFilters({ ...emptyColumnFilters, ...(view.columnFilters || {}) });
    setSortBy(view.sortBy || "empName");
    setSortDir(view.sortDir || "asc");
    setPage(1);
    setActionMessage(`Loaded "${view.name}".`);
  }

  function deleteSelectedView() {
    if (!selectedView) return;
    const next = savedViews.filter((item) => item.id !== selectedView);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    setSavedViews(next);
    setSelectedView("");
    setActionMessage("Saved view deleted.");
  }

  async function shareView() {
    const url = new URL(window.location.href);
    url.searchParams.set("tile", "performance");
    url.searchParams.set("pf", JSON.stringify(currentViewState()));
    try {
      await navigator.clipboard.writeText(url.toString());
      setActionMessage("Share link copied.");
    } catch {
      window.prompt("Copy share link", url.toString());
    }
  }

  function exportExcel() {
    const sheetData = filteredRows.map((row) => ({
      "Employee Code": row.empCode,
      "Employee Name": row.empName,
      "Region / Branch": `${row.region || "-"} / ${row.branch || "-"}`,
      Manager: row.managerName || "-",
      Attendance: row.attendanceLabel || "Unknown",
      "Tour Days": row.tourDays || 0,
      "Tour Requests": row.tourRequests || 0,
      "Tour Approved": row.tourApproved || 0,
      "Total Site Visits": row.siteVisits || 0,
      "New Visits": row.newVisits || 0,
      Revisits: row.revisits || 0,
      "Unique Customers": row.uniqueCustomers || 0,
      "Converted Customers": row.convertedCustomers || 0,
      "Tour Expenses": Number(row.tourExpenses || 0),
      "Total Revenue": Number(row.totalRevenue || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance");
    XLSX.writeFile(wb, `Performance_Review_${filters.from}_to_${filters.to}.xlsx`);
    setActionMessage(`Exported ${sheetData.length} rows.`);
  }

  const freeze = hasColumnFilters
    || filters.region !== "all"
    || filters.branch !== "all"
    || filters.managerCode !== "all"
    || filters.empCode !== "all";

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

          <div style={tableToolbar}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={selectedView} onChange={(e) => applyView(e.target.value)} style={selectStyle}>
                <option value="">Saved views</option>
                {savedViews.map((view) => (
                  <option key={view.id} value={view.id}>{view.name}</option>
                ))}
              </select>
              <button type="button" onClick={saveView} style={refreshBtn}>💾 Save view</button>
              <button type="button" onClick={shareView} style={refreshBtn}>🔗 Share</button>
              <button type="button" onClick={exportExcel} style={refreshBtn}>📥 Export to Excel</button>
              {selectedView && (
                <button type="button" onClick={deleteSelectedView} style={secondaryBtn}>Delete view</button>
              )}
              {hasColumnFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setColumnFilters(emptyColumnFilters);
                    setPage(1);
                  }}
                  style={secondaryBtn}
                >
                  Clear column filters
                </button>
              )}
            </div>
            {actionMessage && <span style={{ fontSize: 12, color: "#047857" }}>{actionMessage}</span>}
          </div>

          <div style={tableWrap(freeze)}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <Th freeze={freeze} col={0} row="head" onClick={() => toggleSort("empCode")} label="Employee Code" />
                  <Th freeze={freeze} col={1} row="head" onClick={() => toggleSort("empName")} label="Employee Name" />
                  <Th freeze={freeze} col={2} row="head" onClick={() => toggleSort("region")} label="Region / Branch" />
                  <Th freeze={freeze} col={3} row="head" onClick={() => toggleSort("managerName")} label="Manager" />
                  <th style={headerCellStyle(freeze, 4, "head")}>Attendance</th>
                  <Th freeze={freeze} col={5} row="head" onClick={() => toggleSort("tourDays")} label="Tour Days" />
                  <Th freeze={freeze} col={6} row="head" onClick={() => toggleSort("tourRequests")} label="Tour Requests" />
                  <Th freeze={freeze} col={7} row="head" onClick={() => toggleSort("siteVisits")} label="Total Site Visits" />
                  <Th freeze={freeze} col={8} row="head" onClick={() => toggleSort("newVisits")} label="New Visits" />
                  <Th freeze={freeze} col={9} row="head" onClick={() => toggleSort("revisits")} label="Revisits" />
                  <Th freeze={freeze} col={10} row="head" onClick={() => toggleSort("uniqueCustomers")} label="Unique Customers" />
                  <Th freeze={freeze} col={11} row="head" onClick={() => toggleSort("convertedCustomers")} label="Converted Customers" />
                  <Th freeze={freeze} col={12} row="head" onClick={() => toggleSort("tourExpenses")} label="Tour Expenses" />
                  <Th freeze={freeze} col={13} row="head" onClick={() => toggleSort("totalRevenue")} label="Total Revenue" />
                </tr>
                <tr style={{ background: "#fff" }}>
                  <FilterCell freeze={freeze} col={0} value={columnFilters.empCode} onChange={(v) => updateColumnFilter("empCode", v)} placeholder="Search" />
                  <FilterCell freeze={freeze} col={1} value={columnFilters.empName} onChange={(v) => updateColumnFilter("empName", v)} placeholder="Search" />
                  <FilterCell freeze={freeze} col={2} value={columnFilters.regionBranch} onChange={(v) => updateColumnFilter("regionBranch", v)} placeholder="Search" />
                  <FilterCell freeze={freeze} col={3} value={columnFilters.managerName} onChange={(v) => updateColumnFilter("managerName", v)} placeholder="Search" />
                  <FilterCell freeze={freeze} col={4} value={columnFilters.attendance} onChange={(v) => updateColumnFilter("attendance", v)} placeholder="P / A / HD" />
                  <FilterCell freeze={freeze} col={5} value={columnFilters.tourDays} onChange={(v) => updateColumnFilter("tourDays", v)} placeholder=">10, 5-20" />
                  <FilterCell freeze={freeze} col={6} value={columnFilters.tourRequests} onChange={(v) => updateColumnFilter("tourRequests", v)} placeholder=">0" />
                  <FilterCell freeze={freeze} col={7} value={columnFilters.siteVisits} onChange={(v) => updateColumnFilter("siteVisits", v)} placeholder=">5" />
                  <FilterCell freeze={freeze} col={8} value={columnFilters.newVisits} onChange={(v) => updateColumnFilter("newVisits", v)} placeholder=">=1" />
                  <FilterCell freeze={freeze} col={9} value={columnFilters.revisits} onChange={(v) => updateColumnFilter("revisits", v)} placeholder="0" />
                  <FilterCell freeze={freeze} col={10} value={columnFilters.uniqueCustomers} onChange={(v) => updateColumnFilter("uniqueCustomers", v)} placeholder=">2" />
                  <FilterCell freeze={freeze} col={11} value={columnFilters.convertedCustomers} onChange={(v) => updateColumnFilter("convertedCustomers", v)} placeholder=">=1" />
                  <FilterCell freeze={freeze} col={12} value={columnFilters.tourExpenses} onChange={(v) => updateColumnFilter("tourExpenses", v)} placeholder=">1000" />
                  <FilterCell freeze={freeze} col={13} value={columnFilters.totalRevenue} onChange={(v) => updateColumnFilter("totalRevenue", v)} placeholder=">50000" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} style={tdStyle}>Loading performance...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={14} style={tdStyle}>No employees found for the selected filters.</td></tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr
                      key={row.empCode}
                      onClick={() => setSelectedEmp(row)}
                      style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}
                    >
                      <td style={bodyCellStyle(freeze, 0)}>{row.empCode}</td>
                      <td style={{ ...bodyCellStyle(freeze, 1), fontWeight: 700, color: "#1d4ed8" }}>{row.empName}</td>
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
            <span>Showing {pagedRows.length} of {filteredRows.length}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>Prev</button>
              <span style={{ padding: "8px 10px" }}>{safePage} / {pageCount}</span>
              <button disabled={safePage >= pageCount} onClick={() => setPage((p) => p + 1)} style={pageBtn}>Next</button>
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

function Th({ label, onClick, freeze, col, row }) {
  return (
    <th style={{ ...headerCellStyle(freeze, col, row), cursor: "pointer" }} onClick={onClick}>{label}</th>
  );
}

function FilterCell({ value, onChange, placeholder, freeze, col }) {
  return (
    <th style={filterCellStyle(freeze, col)}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={colFilterInput}
      />
    </th>
  );
}

const CODE_COL_WIDTH = 120;
const NAME_COL_WIDTH = 180;
const HEAD_ROW_HEIGHT = 42;

function tableWrap(freeze) {
  return {
    overflow: "auto",
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    maxHeight: freeze ? "70vh" : undefined,
  };
}

function stickyCol(freeze, col) {
  if (!freeze || (col !== 0 && col !== 1)) return {};
  return {
    position: "sticky",
    left: col === 0 ? 0 : CODE_COL_WIDTH,
    minWidth: col === 0 ? CODE_COL_WIDTH : NAME_COL_WIDTH,
    width: col === 0 ? CODE_COL_WIDTH : NAME_COL_WIDTH,
    boxShadow: col === 1 ? "2px 0 6px rgba(15,23,42,0.12)" : undefined,
  };
}

function headerCellStyle(freeze, col, row) {
  return {
    ...thStyle,
    background: "#f8fafc",
    ...(freeze ? { position: "sticky", top: row === "filter" ? HEAD_ROW_HEIGHT : 0, zIndex: col <= 1 ? 6 : 4 } : {}),
    ...stickyCol(freeze, col),
  };
}

function filterCellStyle(freeze, col) {
  return {
    padding: "6px 8px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    ...(freeze ? { position: "sticky", top: HEAD_ROW_HEIGHT, zIndex: col <= 1 ? 6 : 4 } : {}),
    ...stickyCol(freeze, col),
  };
}

function bodyCellStyle(freeze, col) {
  return {
    ...tdStyle,
    background: "#fff",
    ...stickyCol(freeze, col),
    ...(freeze && col <= 1 ? { zIndex: 2 } : {}),
  };
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
const secondaryBtn = { padding: "8px 12px", background: "#fff", color: "#334155", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" };
const tableToolbar = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" };
const colFilterInput = { width: "100%", minWidth: 80, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 };
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
