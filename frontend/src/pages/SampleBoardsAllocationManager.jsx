import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";
const safeNum = (v) => (isNaN(v) || v == null ? 0 : Number(v));

export default function SampleBoardsAllocationManager() {
  const { user, token } = useAuth();

  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [usedSampleInput, setUsedSampleInput] = useState({}); // { assignmentId_empCode: { customerId, qty } }

  const [filters, setFilters] = useState({
    assignmentId: "",
    employee: "",
    item: "",
    purpose: "",
  });

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empStock, setEmpStock] = useState([]);
  const [empAssignments, setEmpAssignments] = useState([]);

  /* 🔹 Fetch Manager Stock + History */
  async function fetchStockAndHistory() {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/manager/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStock(data.stock || []);
      setHistory(data.assignments || []);
    } catch (err) {
      console.error("Manager stock/history fetch error:", err);
    }
  }

  useEffect(() => {
    if (token && user?.role === "Manager") fetchStockAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  /* 🔹 Handle Used Sample submission (for self or team) */
  async function handleUsedSample(assignmentId, empCode) {
    const inputKey = `${assignmentId}_${empCode}`;
    const input = usedSampleInput[inputKey] || {};
    if (!input.customerId?.trim()) {
      return alert("❌ Please enter Customer ID / Project Name");
    }

    try {
      const res = await fetch(`${API_BASE}/api/assignments/used-sample`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId,
          empCode,
          customerId: input.customerId.trim(),
          qty: Number(input.qty) || 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setUsedSampleInput((prev) => ({ ...prev, [inputKey]: { customerId: "", qty: 1 } }));
        fetchStockAndHistory(); // Refresh
        if (selectedEmp) fetchEmpData(selectedEmp); // Refresh employee data if viewing
      } else {
        alert(data.message || "❌ Failed to add used sample");
      }
    } catch (err) {
      console.error("Used sample error:", err);
      alert("❌ Failed to add used sample");
    }
  }

  /* 🔹 Fetch My Team */
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`${API_BASE}/api/users/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Team fetch error:", err);
      }
    }
    if (token && user?.role === "Manager") fetchTeam();
  }, [token, user]);

  /* 🔹 Fetch Selected Employee Data */
  const fetchEmpData = async (emp) => {
    setSelectedEmp(emp);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/employee/${emp.empCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEmpStock(data.stock || []);
      setEmpAssignments(data.assignments || []);
    } catch (err) {
      console.error("Employee fetch error:", err);
      setEmpStock([]);
      setEmpAssignments([]);
    }
  };

  /* 🔹 Filtered Manager History */
  const filteredHistory = history.filter((h) => {
    return (
      (!filters.assignmentId ||
        (h.rootId || "").toLowerCase().includes(filters.assignmentId.toLowerCase())) &&
      (!filters.employee ||
        (h.employees || []).some((e) =>
          `${e.name} (${e.empCode})`
            .toLowerCase()
            .includes(filters.employee.toLowerCase())
        )) &&
      (!filters.item || (h.item || "").toLowerCase().includes(filters.item.toLowerCase())) &&
      (!filters.purpose || (h.purpose || "").toLowerCase().includes(filters.purpose.toLowerCase()))
    );
  });

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <h2 style={{ margin: 0 }}>📦 Sample Allocation (Manager)</h2>
        <button
          onClick={fetchStockAndHistory}
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

      {/* 🔹 Manager Stock */}
      <h3>📊 My Current Stock</h3>
      {stock.length > 0 ? (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th>Item</th>
              <th style={{ color: "#1976d2" }}>Received</th>
              <th style={{ color: "#f57c00" }}>Used</th>
              <th style={{ color: "#e65100" }}>Assigned Out</th>
              <th style={{ color: "#388e3c", fontWeight: "bold" }}>Available</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td style={{ textAlign: "center", color: "#1976d2" }}>{s.received || 0}</td>
                <td style={{ textAlign: "center", color: "#f57c00" }}>{s.used || 0}</td>
                <td style={{ textAlign: "center", color: "#e65100" }}>{s.assignedOut || 0}</td>
                <td style={{ textAlign: "center", color: s.stock > 0 ? "#388e3c" : "#999", fontWeight: "bold" }}>
                  {s.stock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>⚠️ No stock assigned yet</p>
      )}

      {/* 🔹 Manager Assignment History */}
      <h3 style={{ marginTop: 30 }}>📑 My Assignment History</h3>
      <div style={{ marginBottom: 10, display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Filter by Root ID"
          value={filters.assignmentId}
          onChange={(e) => setFilters({ ...filters, assignmentId: e.target.value })}
        />
        <input
          type="text"
          placeholder="Filter by Employee"
          value={filters.employee}
          onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
        />
        <input
          type="text"
          placeholder="Filter by Item"
          value={filters.item}
          onChange={(e) => setFilters({ ...filters, item: e.target.value })}
        />
        <input
          type="text"
          placeholder="Filter by Purpose"
          value={filters.purpose}
          onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}
        />
      </div>

      {filteredHistory.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead style={{ background: "#f5f5f5" }}>
              <tr>
                <th>Date</th>
                <th>Root ID</th>
                <th>Item</th>
                <th>Employee</th>
                <th>Qty (Total / Used / Avail)</th>
                <th>Purpose</th>
                <th>LR Details</th>
                <th style={{ background: "#fef3c7", minWidth: 280 }}>
                  📝 Sample Used Against<br/>
                  <span style={{ fontSize: 11, fontWeight: "normal" }}>(Customer ID / Project)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((h, i) =>
                (h.employees || []).map((e, j) => {
                  const available = safeNum(e.qty) - safeNum(e.usedQty);
                  const inputKey = `${h._id}_${e.empCode}`;
                  const currentInput = usedSampleInput[inputKey] || { customerId: "", qty: 1 };

                  return (
                    <tr key={`${i}-${j}`} style={{ background: h.podUpdatedForEmp ? "#e6ffe6" : "white" }}>
                      <td>{h.date}</td>
                      <td>{h.rootId || "-"}</td>
                      <td>{h.item}</td>
                      <td>{e.name} ({e.empCode})</td>
                      <td>
                        <span>T: {safeNum(e.qty)}</span> / {" "}
                        <span style={{ color: "#f59e0b" }}>U: {safeNum(e.usedQty)}</span> / {" "}
                        <span style={{ fontWeight: "bold", color: available > 0 ? "green" : "red" }}>
                          A: {available}
                        </span>
                      </td>
                      <td>{h.purpose}</td>
                      <td style={{ background: h.lrNo ? "#d1fae5" : "white" }}>
                        {h.lrNo ? (
                          <span style={{ fontWeight: "bold", color: "#059669" }}>📦 {h.lrNo}</span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>Pending</span>
                        )}
                      </td>
                      <td style={{ background: "#fef3c7", minWidth: 280 }}>
                        {available > 0 ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                              type="text"
                              placeholder="Customer ID / Project"
                              value={currentInput.customerId}
                              onChange={(ev) =>
                                setUsedSampleInput((prev) => ({
                                  ...prev,
                                  [inputKey]: { ...currentInput, customerId: ev.target.value },
                                }))
                              }
                              style={{ 
                                width: 130, 
                                padding: "5px 8px", 
                                fontSize: "12px",
                                border: "1px solid #d97706",
                                borderRadius: 4,
                              }}
                            />
                            <input
                              type="number"
                              min="1"
                              max={available}
                              value={currentInput.qty}
                              onChange={(ev) =>
                                setUsedSampleInput((prev) => ({
                                  ...prev,
                                  [inputKey]: { ...currentInput, qty: ev.target.value },
                                }))
                              }
                              style={{ 
                                width: 45, 
                                padding: "5px 4px", 
                                fontSize: "12px",
                                border: "1px solid #d97706",
                                borderRadius: 4,
                                textAlign: "center",
                              }}
                            />
                            <button
                              onClick={() => handleUsedSample(h._id, e.empCode)}
                              style={{
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                padding: "5px 10px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              ✓ Update
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: "bold" }}>
                            ❌ Stock Exhausted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p>⚠️ No assignment history found.</p>
      )}

      {/* 🔹 Your Reportees */}
      <h3 style={{ marginTop: 40 }}>👥 Your Reportees</h3>
      {employees.length === 0 ? (
        <p>⚠️ No team members found.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {employees.map((emp) => (
            <button
              key={emp.empCode}
              onClick={() => fetchEmpData(emp)}
              style={{
                padding: "8px 12px",
                background: selectedEmp?.empCode === emp.empCode ? "#4caf50" : "#2196f3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {emp.name} ({emp.empCode})
            </button>
          ))}
        </div>
      )}

      {/* 🔹 Selected Employee Info */}
      {selectedEmp && (
        <div
          style={{
            marginTop: 25,
            padding: 15,
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <h4>
            📋 {selectedEmp.name} ({selectedEmp.empCode}) – Details
          </h4>

          {/* Employee’s Current Stock */}
          <h5 style={{ marginTop: 10 }}>📦 Current Stock</h5>
          {empStock.length > 0 ? (
            <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{empStock.map((s) => <th key={s.name}>{s.name}</th>)}</tr>
              </thead>
              <tbody>
                <tr>{empStock.map((s) => <td key={s.name}>{s.stock}</td>)}</tr>
              </tbody>
            </table>
          ) : (
            <p>⚠️ No stock data available.</p>
          )}

          {/* Employee's Assignment History */}
          <h5 style={{ marginTop: 20 }}>📑 Assignment History</h5>
          {empAssignments.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                border="1"
                cellPadding="6"
                style={{ width: "100%", borderCollapse: "collapse", background: "white", fontSize: "13px" }}
              >
                <thead style={{ background: "#eee" }}>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Qty (T/U/A)</th>
                    <th>Purpose</th>
                    <th>Assigned By</th>
                    <th>LR No.</th>
                    <th style={{ background: "#fef3c7", minWidth: 280 }}>
                      📝 Sample Used Against
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {empAssignments.map((a, i) =>
                    (a.employees || [])
                      .filter((e) => e.empCode === selectedEmp.empCode)
                      .map((e, j) => {
                        const available = safeNum(e.qty) - safeNum(e.usedQty);
                        const inputKey = `${a._id}_${e.empCode}`;
                        const currentInput = usedSampleInput[inputKey] || { customerId: "", qty: 1 };

                        return (
                          <tr key={`${i}-${j}`}>
                            <td>{a.date}</td>
                            <td>{a.item}</td>
                            <td>
                              <span>{safeNum(e.qty)}</span> / {" "}
                              <span style={{ color: "#f59e0b" }}>{safeNum(e.usedQty)}</span> / {" "}
                              <span style={{ fontWeight: "bold", color: available > 0 ? "green" : "red" }}>
                                {available}
                              </span>
                            </td>
                            <td>{a.purpose}</td>
                            <td>{a.assignedBy}</td>
                            <td>{a.lrNo || "-"}</td>
                            <td style={{ background: "#fef3c7", minWidth: 280 }}>
                              {available > 0 ? (
                                <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                                  <input
                                    type="text"
                                    placeholder="Customer / Project"
                                    value={currentInput.customerId}
                                    onChange={(ev) =>
                                      setUsedSampleInput((prev) => ({
                                        ...prev,
                                        [inputKey]: { ...currentInput, customerId: ev.target.value },
                                      }))
                                    }
                                    style={{ 
                                      width: 120, 
                                      padding: "4px 6px", 
                                      fontSize: "11px",
                                      border: "1px solid #d97706",
                                      borderRadius: 4,
                                    }}
                                  />
                                  <input
                                    type="number"
                                    min="1"
                                    max={available}
                                    value={currentInput.qty}
                                    onChange={(ev) =>
                                      setUsedSampleInput((prev) => ({
                                        ...prev,
                                        [inputKey]: { ...currentInput, qty: ev.target.value },
                                      }))
                                    }
                                    style={{ 
                                      width: 40, 
                                      padding: "4px", 
                                      fontSize: "11px",
                                      border: "1px solid #d97706",
                                      borderRadius: 4,
                                      textAlign: "center",
                                    }}
                                  />
                                  <button
                                    onClick={() => handleUsedSample(a._id, e.empCode)}
                                    style={{
                                      background: "#16a34a",
                                      color: "white",
                                      border: "none",
                                      borderRadius: 4,
                                      padding: "4px 8px",
                                      cursor: "pointer",
                                      fontSize: "11px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    ✓
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: "#dc2626", fontSize: "11px" }}>❌ Exhausted</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p>⚠️ No assignment history found.</p>
          )}

          {/* Employee's Sample Usage History */}
          <h5 style={{ marginTop: 20 }}>📋 {selectedEmp.name}'s Sample Usage History</h5>
          {empAssignments.some((a) =>
            (a.employees || []).some(
              (e) => e.empCode === selectedEmp.empCode && e.usedSamples?.length > 0
            )
          ) ? (
            <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead style={{ background: "#d1fae5" }}>
                <tr>
                  <th>Item</th>
                  <th>Used Against (Customer ID / Project)</th>
                  <th>Qty Used</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {empAssignments.flatMap((a) =>
                  (a.employees || [])
                    .filter((e) => e.empCode === selectedEmp.empCode && e.usedSamples?.length > 0)
                    .flatMap((e) =>
                      e.usedSamples.map((us, idx) => (
                        <tr key={`${a._id}-${idx}`}>
                          <td>{a.item}</td>
                          <td style={{ fontWeight: "bold", color: "#1d4ed8" }}>{us.customerId}</td>
                          <td style={{ textAlign: "center" }}>{us.qty}</td>
                          <td>{us.usedAt ? new Date(us.usedAt).toLocaleDateString() : "-"}</td>
                        </tr>
                      ))
                    )
                )}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#6b7280" }}>⚠️ No samples used yet by this employee.</p>
          )}
        </div>
      )}

      {/* 🔹 All Team Sample Usage History */}
      <h3 style={{ marginTop: 40 }}>📋 Team Sample Usage History</h3>
      {history.some((h) =>
        (h.employees || []).some((e) => e.usedSamples?.length > 0)
      ) ? (
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead style={{ background: "#d1fae5" }}>
            <tr>
              <th>Employee</th>
              <th>Item</th>
              <th>Used Against (Customer ID / Project)</th>
              <th>Qty Used</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.flatMap((h) =>
              (h.employees || [])
                .filter((e) => e.usedSamples?.length > 0)
                .flatMap((e) =>
                  e.usedSamples.map((us, idx) => (
                    <tr key={`${h._id}-${e.empCode}-${idx}`}>
                      <td>{e.name} ({e.empCode})</td>
                      <td>{h.item}</td>
                      <td style={{ fontWeight: "bold", color: "#1d4ed8" }}>{us.customerId}</td>
                      <td style={{ textAlign: "center" }}>{us.qty}</td>
                      <td>{us.usedAt ? new Date(us.usedAt).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))
                )
            )}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "#6b7280" }}>⚠️ No samples used yet by team members.</p>
      )}
    </div>
  );
}
