// frontend/src/pages/RegionalAssets.jsx - Regional Manager's Assignment Table
import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RegionalAssets() {
  const { user, token } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [year, setYear] = useState("All");
  const [lot, setLot] = useState("All");
  const [searchName, setSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // History Modal
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empHistory, setEmpHistory] = useState([]);

  // Dynamic sample board items
  const [sampleItems, setSampleItems] = useState([]);

  // Fetch team members for this region
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`${API_BASE}/api/users/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Filter only Employee, Manager, BranchManager
        const filtered = (data || []).filter(u =>
          ["Employee", "Manager", "BranchManager", "Branch Manager"].includes(u.role)
        );
        setEmployees(filtered);
      } catch (err) {
        console.error("Error fetching team:", err);
      }
    }
    if (token) fetchTeam();
  }, [token]);

  // Fetch all assignments for regional team
  async function fetchAssignments() {
    try {
      setLoading(true);
      // ✅ Fetch all assignments (like admin does)
      const res = await fetch(`${API_BASE}/api/assignments/regional/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allAssignments = await res.json();
      console.log("📊 All assignments fetched:", Array.isArray(allAssignments) ? allAssignments.length : 0);
      setAssignments(Array.isArray(allAssignments) ? allAssignments : []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Also fetch stock items (like Admin does)
  async function fetchStockItems() {
    try {
      const res = await fetch(`${API_BASE}/api/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        const stockItemNames = data.items.map(item => item.name);
        setSampleItems(stockItemNames);
      }
    } catch (err) {
      console.error("Error fetching stock items:", err);
    }
  }

  // ✅ Also include items from assignments that might not be in stock
  useEffect(() => {
    if (assignments.length > 0) {
      const assignmentItems = [...new Set(assignments.map(a => a.item).filter(Boolean))];
      setSampleItems(prev => {
        const merged = [...new Set([...prev, ...assignmentItems])];
        return merged;
      });
    }
  }, [assignments]);

  useEffect(() => {
    if (token) {
      fetchStockItems();
      fetchAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Filter assignments by date
  const filterByDate = (assignment) => {
    if (!dateFrom && !dateTo) return true;
    const assignDate = new Date(assignment.date || assignment.createdAt);
    if (dateFrom && assignDate < new Date(dateFrom)) return false;
    if (dateTo && assignDate > new Date(dateTo + "T23:59:59")) return false;
    return true;
  };

  // Calculate stock for each employee
  const calculateEmpStock = (empCode, empName) => {
    const stock = {};
    sampleItems.forEach(item => {
      stock[item] = { assigned: 0, used: 0, assignedOut: 0, available: 0 };
    });

    assignments.filter(filterByDate).forEach(a => {
      // Filter by year if needed
      const assignYear = a.year ? parseInt(a.year) : new Date(a.createdAt || a.date).getFullYear();
      if (year !== "All" && assignYear !== parseInt(year)) return;

      // Filter by lot if needed
      if (lot !== "All" && a.lot !== lot) return;

      const item = a.item;
      if (!stock[item]) {
        stock[item] = { assigned: 0, used: 0, assignedOut: 0, available: 0 };
      }

      // Count RECEIVED qty
      (a.employees || []).forEach(emp => {
        if (emp.empCode === empCode) {
          stock[item].assigned += emp.qty || 0;
          stock[item].used += emp.usedQty || 0;
        }
      });

      // Count ASSIGNED OUT qty
      if (a.assignerEmpCode === empCode || a.assignedBy === empName) {
        (a.employees || []).forEach(emp => {
          if (emp.empCode !== empCode) {
            stock[item].assignedOut += emp.qty || 0;
          }
        });
      }
    });

    // Calculate available
    Object.keys(stock).forEach(item => {
      stock[item].available = stock[item].assigned - stock[item].used - stock[item].assignedOut;
    });

    return stock;
  };

  // Get employee history
  const getEmpHistory = (empCode, empName) => {
    const history = [];

    assignments.filter(filterByDate).forEach(a => {
      (a.employees || []).forEach(emp => {
        if (emp.empCode === empCode) {
          history.push({
            type: "received",
            date: a.date,
            item: a.item,
            qty: emp.qty,
            usedQty: emp.usedQty || 0,
            purpose: a.purpose,
            assignedBy: a.assignedBy,
            rootId: a.rootId,
            lrNo: a.lrNo || "",
          });
        }
      });
    });

    assignments.filter(filterByDate).forEach(a => {
      if (a.assignerEmpCode === empCode || a.assignedBy === empName) {
        (a.employees || []).forEach(emp => {
          if (emp.empCode !== empCode) {
            history.push({
              type: "assigned_out",
              date: a.date,
              item: a.item,
              qty: emp.qty,
              assignedTo: emp.name,
              assignedToCode: emp.empCode,
              purpose: a.purpose,
              rootId: a.rootId,
              lrNo: a.lrNo || "",
            });
          }
        });
      }
    });

    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Open history modal
  const openHistory = (emp) => {
    setSelectedEmp(emp);
    setEmpHistory(getEmpHistory(emp.empCode, emp.name));
    setShowHistory(true);
  };

  // Filter employees by search
  const filteredEmps = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchName.toLowerCase()) ||
    emp.empCode?.toLowerCase().includes(searchName.toLowerCase())
  );

  const years = ["All", 2024, 2025, 2026, 2027];
  const lots = ["All", "Lot 1", "Lot 2", "Lot 3"];

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredEmps.map((emp) => {
      const stock = calculateEmpStock(emp.empCode, emp.name);
      const row = {
        "Emp Code": emp.empCode,
        "Emp Name": emp.name,
        "Role": emp.role,
        "Branch": emp.branch || "-",
      };

      sampleItems.forEach((item) => {
        row[`${item} (Assigned)`] = stock[item]?.assigned || 0;
        row[`${item} (Used)`] = (stock[item]?.used || 0) + (stock[item]?.assignedOut || 0);
        row[`${item} (Available)`] = stock[item]?.available || 0;
      });

      row["Total Assigned"] = sampleItems.reduce((sum, item) => sum + (stock[item]?.assigned || 0), 0);
      row["Total Used"] = sampleItems.reduce((sum, item) => sum + ((stock[item]?.used || 0) + (stock[item]?.assignedOut || 0)), 0);
      row["Total Available"] = sampleItems.reduce((sum, item) => sum + (stock[item]?.available || 0), 0);

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Regional Assignment Table");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Regional_Assignment_Table_${user?.region || "All"}_${dateStr}.xlsx`);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>📊 Regional Assignment Table</h2>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14 }}>
            Region: <b style={{ color: "#3b82f6" }}>{user?.region || "N/A"}</b>
          </p>
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

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: 15,
        marginBottom: 20,
        flexWrap: "wrap",
        alignItems: "center",
        padding: 15,
        background: "#f8fafc",
        borderRadius: 12,
      }}>
        <div>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Year</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 100 }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Lot</label>
          <select
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 100 }}
          >
            {lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Search</label>
          <input
            type="text"
            placeholder="🔍 Name or Code..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 180 }}
          />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => { setYear("All"); setLot("All"); setDateFrom(""); setDateTo(""); setSearchName(""); }}
            style={{
              marginTop: 18,
              padding: "8px 16px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            🔄 Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#3b82f6", color: "white" }}>
                <th style={thStyle}>Emp Code</th>
                <th style={thStyle}>Emp Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Branch</th>
                {sampleItems.map(item => (
                  <th key={item} style={{ ...thStyle, textAlign: "center", minWidth: 120 }}>
                    {item}
                    <div style={{ fontSize: 10, fontWeight: 400 }}>Asgn / Used / Avl</div>
                  </th>
                ))}
                <th style={{ ...thStyle, background: "#1e40af" }}>Total</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmps.length === 0 ? (
                <tr>
                  <td colSpan={5 + sampleItems.length} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                    No team members found
                  </td>
                </tr>
              ) : (
                filteredEmps.map((emp, idx) => {
                  const stock = calculateEmpStock(emp.empCode, emp.name);
                  const totalAssigned = sampleItems.reduce((sum, item) => sum + (stock[item]?.assigned || 0), 0);
                  const totalUsed = sampleItems.reduce((sum, item) => sum + ((stock[item]?.used || 0) + (stock[item]?.assignedOut || 0)), 0);
                  const totalAvailable = sampleItems.reduce((sum, item) => sum + (stock[item]?.available || 0), 0);

                  return (
                    <tr key={emp.empCode} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={tdStyle}><b style={{ color: "#3b82f6" }}>{emp.empCode}</b></td>
                      <td style={tdStyle}>{emp.name}</td>
                      <td style={tdStyle}>{emp.role}</td>
                      <td style={tdStyle}>{emp.branch || "-"}</td>
                      {sampleItems.map(item => (
                        <td key={item} style={{ ...tdStyle, textAlign: "center" }}>
                          <span style={{ color: "#3b82f6" }}>{stock[item]?.assigned || 0}</span>
                          {" / "}
                          <span style={{ color: "#f59e0b" }}>{(stock[item]?.used || 0) + (stock[item]?.assignedOut || 0)}</span>
                          {" / "}
                          <span style={{ color: "#22c55e", fontWeight: 600 }}>{stock[item]?.available || 0}</span>
                        </td>
                      ))}
                      <td style={{ ...tdStyle, textAlign: "center", background: "#f0f9ff" }}>
                        <span style={{ color: "#3b82f6" }}>{totalAssigned}</span>
                        {" / "}
                        <span style={{ color: "#f59e0b" }}>{totalUsed}</span>
                        {" / "}
                        <span style={{ color: "#22c55e", fontWeight: 700 }}>{totalAvailable}</span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => openHistory(emp)}
                          style={{
                            background: "#8b5cf6",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          📜 History
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedEmp && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📜 History - {selectedEmp.name} ({selectedEmp.empCode})</h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{ background: "#ef4444", color: "white", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}
              >
                ✕ Close
              </button>
            </div>

            {empHistory.length === 0 ? (
              <p style={{ textAlign: "center", color: "#64748b" }}>No history found</p>
            ) : (
              <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", position: "sticky", top: 0 }}>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Item</th>
                      <th style={thStyle}>Qty</th>
                      <th style={thStyle}>Used</th>
                      <th style={thStyle}>Purpose</th>
                      <th style={thStyle}>Assigned By/To</th>
                      <th style={thStyle}>LR No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empHistory.map((h, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={tdStyle}>
                          <span style={{
                            background: h.type === "received" ? "#dcfce7" : "#fef3c7",
                            color: h.type === "received" ? "#16a34a" : "#d97706",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                          }}>
                            {h.type === "received" ? "📥 Received" : "📤 Assigned Out"}
                          </span>
                        </td>
                        <td style={tdStyle}>{h.date ? new Date(h.date).toLocaleDateString() : "-"}</td>
                        <td style={tdStyle}>{h.item}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "#3b82f6" }}>{h.qty}</td>
                        <td style={{ ...tdStyle, color: "#f59e0b" }}>{h.usedQty || "-"}</td>
                        <td style={tdStyle}>{h.purpose || "-"}</td>
                        <td style={tdStyle}>
                          {h.type === "received" ? h.assignedBy : `${h.assignedTo} (${h.assignedToCode})`}
                        </td>
                        <td style={tdStyle}>{h.lrNo || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle = { padding: "12px 8px", textAlign: "left", fontWeight: 600 };
const tdStyle = { padding: "10px 8px", borderBottom: "1px solid #e2e8f0" };
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};
const modalContent = {
  background: "white",
  borderRadius: 12,
  padding: 24,
  maxWidth: 1100,
  width: "95%",
  maxHeight: "90vh",
  overflow: "auto",
};
