import { useState, useEffect } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AssignmentTable() {
  const { token } = useAuth();
  
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters - Default to "All" to show all assignments
  const [year, setYear] = useState("All");
  const [lot, setLot] = useState("All");
  const [searchName, setSearchName] = useState("");
  
  // History Modal
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empHistory, setEmpHistory] = useState([]);

  // ✅ Dynamic sample board items from Stock API + Assignments
  const [sampleItems, setSampleItems] = useState([]);

  // ✅ Fetch stock items from database AND merge with assignment items
  useEffect(() => {
    async function fetchStockItems() {
      try {
        const res = await fetch(`${API_BASE}/api/stock`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          // Extract unique item names from stock
          const stockItemNames = data.items.map(item => item.name);
          setSampleItems(stockItemNames);
        }
      } catch (err) {
        console.error("Error fetching stock items:", err);
        setSampleItems([]);
      }
    }
    if (token) fetchStockItems();
  }, [token]);

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

  // Fetch employees (only Emp, Manager, BM)
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`${API_BASE}/api/users/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Filter only Employee, Manager, BranchManager
        const filtered = (data || []).filter(u => 
          ["Employee", "Manager", "BranchManager", "Branch Manager"].includes(u.role)
        );
        setEmployees(filtered);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    }
    if (token) fetchUsers();
  }, [token]);

  // Fetch all assignments
  async function fetchAssignments() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/assignments/history/admin?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Calculate stock for each employee
  // Stock = Received - (Used + Assigned Out to Others)
  const calculateEmpStock = (empCode, empName) => {
    const stock = {};
    // ✅ Initialize with dynamic items
    sampleItems.forEach(item => {
      stock[item] = { assigned: 0, used: 0, assignedOut: 0, available: 0 };
    });

    assignments.forEach(a => {
      // Filter by year if needed
      const assignYear = a.year ? parseInt(a.year) : new Date(a.createdAt || a.date).getFullYear();
      if (year !== "All" && assignYear !== parseInt(year)) return;

      // Filter by lot if needed
      if (lot !== "All" && a.lot !== lot) return;

      const item = a.item;
      // ✅ Create entry if item exists in assignment but not in stock list
      if (!stock[item]) {
        stock[item] = { assigned: 0, used: 0, assignedOut: 0, available: 0 };
      }

      // ✅ Count RECEIVED qty (when this person is in employees array)
      (a.employees || []).forEach(emp => {
        if (emp.empCode === empCode) {
          stock[item].assigned += emp.qty || 0;
          stock[item].used += emp.usedQty || 0;
        }
      });

      // ✅ Count ASSIGNED OUT qty (when this person assigned to others)
      if (a.assignerEmpCode === empCode || a.assignedBy === empName) {
        (a.employees || []).forEach(emp => {
          if (emp.empCode !== empCode) {
            stock[item].assignedOut += emp.qty || 0;
          }
        });
      }
    });

    // Calculate available = assigned - used - assignedOut
    Object.keys(stock).forEach(item => {
      stock[item].available = stock[item].assigned - stock[item].used - stock[item].assignedOut;
    });

    return stock;
  };

  // Get employee history
  const getEmpHistory = (empCode, empName) => {
    const history = [];
    
    // 1. Records where this employee RECEIVED stock
    assignments.forEach(a => {
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
            rmId: a.rmId,
            bmId: a.bmId,
            lrNo: a.lrNo || "",           // ✅ Added LR No.
            toVendor: a.toVendor || false, // ✅ Added dispatch status
            usedSamples: emp.usedSamples || []
          });
        }
      });
    });

    // 2. Records where this employee ASSIGNED OUT to others
    assignments.forEach(a => {
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
              rmId: a.rmId,
              bmId: a.bmId,
              lrNo: a.lrNo || "",           // ✅ Added LR No.
              toVendor: a.toVendor || false, // ✅ Added dispatch status
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

  // Years for filter
  const years = ["All", 2024, 2025, 2026];
  const lots = ["All", "Lot 1", "Lot 2", "Lot 3"];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>📋 Assignment Table (Employee-wise Stock)</h2>
        <button
          onClick={fetchAssignments}
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

      {/* Filters */}
      <div style={{ display: "flex", gap: 15, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label style={{ marginRight: 8, fontWeight: 600 }}>Year:</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: "6px 12px" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ marginRight: 8, fontWeight: 600 }}>Lot:</label>
          <select value={lot} onChange={(e) => setLot(e.target.value)} style={{ padding: "6px 12px" }}>
            {lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <input
            type="text"
            placeholder="🔍 Search by Name or Emp Code"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ padding: "6px 12px", minWidth: 220 }}
          />
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#666" }}>
          Total: <b>{filteredEmps.length}</b> employees
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : sampleItems.length === 0 ? (
        <p style={{ color: "#999" }}>⚠️ No stock items found. Please add items in Sample Boards Allocation first.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1200, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1976d2", color: "white" }}>
                <th style={{ padding: 10, border: "1px solid #ddd", position: "sticky", left: 0, background: "#1976d2", zIndex: 2 }}>Emp Code</th>
                <th style={{ padding: 10, border: "1px solid #ddd", position: "sticky", left: 80, background: "#1976d2", zIndex: 2 }}>Emp Name</th>
                <th style={{ padding: 10, border: "1px solid #ddd" }}>Role</th>
                <th style={{ padding: 10, border: "1px solid #ddd" }}>Branch</th>
                {sampleItems.map(item => (
                  <th key={item} style={{ padding: 10, border: "1px solid #ddd", minWidth: 100 }}>
                    <div style={{ fontSize: 11 }}>{item}</div>
                    <div style={{ fontSize: 10, fontWeight: 400, marginTop: 4 }}>
                      <span style={{ color: "#90caf9" }}>Asgn</span> | 
                      <span style={{ color: "#ffcc80" }}> Used</span> | 
                      <span style={{ color: "#a5d6a7" }}> Avl</span>
                    </div>
                  </th>
                ))}
                <th style={{ padding: 10, border: "1px solid #ddd" }}>Total Assigned</th>
                <th style={{ padding: 10, border: "1px solid #ddd" }}>Total Used</th>
                <th style={{ padding: 10, border: "1px solid #ddd" }}>Total Available</th>
                <th style={{ padding: 10, border: "1px solid #ddd" }}>History</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmps.map((emp, idx) => {
                const stock = calculateEmpStock(emp.empCode, emp.name);
                // ✅ Only count items that exist in sampleItems list
                const totalAssigned = sampleItems.reduce((sum, item) => sum + (stock[item]?.assigned || 0), 0);
                const totalUsed = sampleItems.reduce((sum, item) => sum + ((stock[item]?.used || 0) + (stock[item]?.assignedOut || 0)), 0);
                const totalAvailable = sampleItems.reduce((sum, item) => sum + (stock[item]?.available || 0), 0);

                return (
                  <tr key={emp.empCode} style={{ background: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={{ padding: 8, border: "1px solid #ddd", position: "sticky", left: 0, background: idx % 2 === 0 ? "#fff" : "#f9f9f9", fontWeight: 500 }}>
                      {emp.empCode}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #ddd", position: "sticky", left: 80, background: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                      {emp.name}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #ddd", fontSize: 11 }}>
                      <span style={{ 
                        background: emp.role === "Employee" ? "#e3f2fd" : emp.role === "Manager" ? "#e8f5e9" : "#fff3e0",
                        padding: "2px 6px",
                        borderRadius: 4
                      }}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ padding: 8, border: "1px solid #ddd", fontSize: 12 }}>{emp.branch || "-"}</td>
                    {sampleItems.map(item => (
                      <td key={item} style={{ padding: 8, border: "1px solid #ddd", textAlign: "center" }}>
                        <span style={{ color: "#1976d2" }}>{stock[item]?.assigned || 0}</span>
                        <span style={{ color: "#999" }}> | </span>
                        <span style={{ color: "#f57c00" }}>{(stock[item]?.used || 0) + (stock[item]?.assignedOut || 0)}</span>
                        <span style={{ color: "#999" }}> | </span>
                        <span style={{ color: (stock[item]?.available || 0) > 0 ? "#388e3c" : "#999" }}>{stock[item]?.available || 0}</span>
                      </td>
                    ))}
                    <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", fontWeight: 600, color: "#1976d2" }}>
                      {totalAssigned}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", fontWeight: 600, color: "#f57c00" }}>
                      {totalUsed}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", fontWeight: 600, color: totalAvailable > 0 ? "#388e3c" : "#999" }}>
                      {totalAvailable}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center" }}>
                      <button
                        onClick={() => openHistory(emp)}
                        style={{
                          background: "#7c4dff",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          padding: "4px 10px",
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        📜 View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedEmp && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            maxWidth: 900,
            width: "95%",
            maxHeight: "85vh",
            overflow: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>
                📜 Assignment History - {selectedEmp.name} ({selectedEmp.empCode})
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer"
                }}
              >
                ✕ Close
              </button>
            </div>

            {empHistory.length === 0 ? (
              <p style={{ color: "#999" }}>No assignment history found.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Type</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Date</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Item</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Qty</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Used/Given To</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Purpose</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>By/To</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>ID</th>
                    <th style={{ padding: 8, border: "1px solid #ddd", background: "#e8f5e9" }}>LR No.</th>
                    <th style={{ padding: 8, border: "1px solid #ddd", background: "#fff3e0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {empHistory.map((h, i) => (
                    <tr key={i} style={{ 
                      background: h.type === "assigned_out" 
                        ? "#fff3e0" 
                        : (i % 2 === 0 ? "#e8f5e9" : "#f1f8e9")
                    }}>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>
                        <span style={{
                          background: h.type === "received" ? "#4caf50" : "#ff9800",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600
                        }}>
                          {h.type === "received" ? "📥 Received" : "📤 Assigned Out"}
                        </span>
                      </td>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>{h.date}</td>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>{h.item}</td>
                      <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", fontWeight: 600, color: h.type === "received" ? "#1976d2" : "#f57c00" }}>
                        {h.qty}
                      </td>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>
                        {h.type === "received" ? (
                          h.usedSamples?.length > 0 ? (
                            <div style={{ fontSize: 11 }}>
                              {h.usedSamples.map((us, j) => (
                                <div key={j}><b>{us.customerId}</b> (Qty: {us.qty})</div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "#999" }}>Used: {h.usedQty || 0}</span>
                          )
                        ) : (
                          <span style={{ color: "#e65100" }}>{h.assignedTo} ({h.assignedToCode})</span>
                        )}
                      </td>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>
                        <span style={{
                          background: h.purpose?.includes("Project") ? "#e8f5e9" : "#e3f2fd",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 11
                        }}>
                          {h.purpose}
                        </span>
                      </td>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>
                        {h.type === "received" ? h.assignedBy : h.assignedTo}
                      </td>
                      <td style={{ padding: 8, border: "1px solid #ddd", fontSize: 10, color: "#666" }}>
                        {h.bmId || h.rmId || h.rootId}
                      </td>
                      {/* ✅ LR No. Column */}
                      <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", background: "#e8f5e9" }}>
                        {h.lrNo ? (
                          <span style={{ color: "#2e7d32", fontWeight: 600 }}>📦 {h.lrNo}</span>
                        ) : (
                          <span style={{ color: "#999" }}>-</span>
                        )}
                      </td>
                      {/* ✅ Dispatch Status Column */}
                      <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", background: "#fff3e0" }}>
                        {h.toVendor ? (
                          <span style={{ color: "#2e7d32", fontWeight: 600, fontSize: 11 }}>✅ Dispatched</span>
                        ) : (
                          <span style={{ color: "#f57c00", fontSize: 11 }}>⏳ Pending</span>
                        )}
                      </td>
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

