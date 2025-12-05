import { useState, useEffect } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AssignmentTable() {
  const { token } = useAuth();
  
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [year, setYear] = useState(new Date().getFullYear());
  const [lot, setLot] = useState("All");
  const [searchName, setSearchName] = useState("");
  
  // History Modal
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empHistory, setEmpHistory] = useState([]);

  // Sample board items
  const sampleItems = [
    "Blenze Pro PDB",
    "Impact PDB",
    "Horizon PDB",
    "Evo PDB",
    "Orna PDB"
  ];

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
  useEffect(() => {
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
    if (token) fetchAssignments();
  }, [token]);

  // Calculate stock for each employee
  const calculateEmpStock = (empCode) => {
    const stock = {};
    sampleItems.forEach(item => {
      stock[item] = { assigned: 0, used: 0, available: 0 };
    });

    assignments.forEach(a => {
      // Filter by year if needed
      const assignYear = new Date(a.createdAt || a.date).getFullYear();
      if (year !== "All" && assignYear !== parseInt(year)) return;

      (a.employees || []).forEach(emp => {
        if (emp.empCode === empCode) {
          const item = a.item;
          if (stock[item]) {
            stock[item].assigned += emp.qty || 0;
            stock[item].used += emp.usedQty || 0;
            stock[item].available = stock[item].assigned - stock[item].used;
          }
        }
      });
    });

    return stock;
  };

  // Get employee history
  const getEmpHistory = (empCode) => {
    const history = [];
    assignments.forEach(a => {
      (a.employees || []).forEach(emp => {
        if (emp.empCode === empCode) {
          history.push({
            date: a.date,
            item: a.item,
            qty: emp.qty,
            usedQty: emp.usedQty || 0,
            purpose: a.purpose,
            assignedBy: a.assignedBy,
            rootId: a.rootId,
            rmId: a.rmId,
            bmId: a.bmId,
            usedSamples: emp.usedSamples || []
          });
        }
      });
    });
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Open history modal
  const openHistory = (emp) => {
    setSelectedEmp(emp);
    setEmpHistory(getEmpHistory(emp.empCode));
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
      <h2 style={{ marginBottom: 20 }}>📋 Assignment Table (Employee-wise Stock)</h2>

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
                const stock = calculateEmpStock(emp.empCode);
                const totalAssigned = Object.values(stock).reduce((sum, s) => sum + s.assigned, 0);
                const totalUsed = Object.values(stock).reduce((sum, s) => sum + s.used, 0);
                const totalAvailable = Object.values(stock).reduce((sum, s) => sum + s.available, 0);

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
                        <span style={{ color: "#1976d2" }}>{stock[item].assigned}</span>
                        <span style={{ color: "#999" }}> | </span>
                        <span style={{ color: "#f57c00" }}>{stock[item].used}</span>
                        <span style={{ color: "#999" }}> | </span>
                        <span style={{ color: stock[item].available > 0 ? "#388e3c" : "#999" }}>{stock[item].available}</span>
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
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Date</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Item</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Assigned Qty</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Used Qty</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Purpose</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Assigned By</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Root ID</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Used Against (Customers)</th>
                  </tr>
                </thead>
                <tbody>
                  {empHistory.map((h, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>{h.date}</td>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>{h.item}</td>
                      <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", color: "#1976d2", fontWeight: 600 }}>{h.qty}</td>
                      <td style={{ padding: 8, border: "1px solid #ddd", textAlign: "center", color: "#f57c00", fontWeight: 600 }}>{h.usedQty}</td>
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
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>{h.assignedBy}</td>
                      <td style={{ padding: 8, border: "1px solid #ddd", fontSize: 10, color: "#666" }}>{h.rootId}</td>
                      <td style={{ padding: 8, border: "1px solid #ddd" }}>
                        {h.usedSamples?.length > 0 ? (
                          <div style={{ fontSize: 11 }}>
                            {h.usedSamples.map((us, j) => (
                              <div key={j} style={{ marginBottom: 2 }}>
                                <b>{us.customerId}</b> (Qty: {us.qty})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#999" }}>-</span>
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

