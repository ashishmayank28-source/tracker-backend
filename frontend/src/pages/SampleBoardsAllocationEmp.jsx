import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";
const safeNum = (v) => (isNaN(v) || v == null ? 0 : Number(v));

export default function SampleBoardsAllocationEmp() {
  const { user, token } = useAuth();
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [usedSampleInput, setUsedSampleInput] = useState({}); // { assignmentId: { customerId, qty } }

  /* 🔹 Fetch Employee Stock + History */
  async function fetchStock() {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/employee/${user?.empCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stock");
      const data = await res.json();
      setStock(data.stock || []);
      setHistory(data.assignments || []);
    } catch (err) {
      console.error("Employee stock fetch error:", err);
      setStock([]);
      setHistory([]);
    }
  }

  useEffect(() => {
    if (token && user?.role === "Employee") fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  /* 🔹 Handle Used Sample submission */
  async function handleUsedSample(assignmentId, empCode) {
    const input = usedSampleInput[assignmentId] || {};
    if (!input.customerId?.trim()) {
      return alert("❌ Please enter Customer ID");
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
        setUsedSampleInput((prev) => ({ ...prev, [assignmentId]: { customerId: "", qty: 1 } }));
        fetchStock(); // Refresh
      } else {
        alert(data.message || "❌ Failed to add used sample");
      }
    } catch (err) {
      console.error("Used sample error:", err);
      alert("❌ Failed to add used sample");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 Sample Boards Allocation</h2>

      {/* Stock Section */}
      <h3>📊 My Current Stock</h3>
      {stock.length > 0 ? (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f3f4f6" }}>
            <tr>
              <th>Item</th>
              <th>Total Assigned</th>
              <th>Used</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td>{safeNum(s.total)}</td>
                <td>{safeNum(s.used)}</td>
                <td style={{ fontWeight: "bold", color: s.stock > 0 ? "green" : "red" }}>
                  {safeNum(s.stock)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>⚠️ No stock assigned yet</p>
      )}

      {/* Assignment History Section */}
      <h3 style={{ marginTop: 30 }}>📑 My Assignment History</h3>
      {history.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th>Root ID</th>
                <th>RM ID</th>
                <th>BM ID</th>
                <th>Date</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Purpose</th>
                <th>Assigned By</th>
                <th>LR Details (From Vendor)</th>
                <th style={{ background: "#fef3c7", minWidth: 280 }}>
                  📝 Sample Used Against<br/>
                  <span style={{ fontSize: 11, fontWeight: "normal" }}>(Customer ID / Project)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((a, i) =>
                (a.employees || [])
                  .filter((e) => e.empCode === user.empCode)
                  .map((e, j) => {
                    const available = safeNum(e.qty) - safeNum(e.usedQty);
                    const inputKey = a._id;
                    const currentInput = usedSampleInput[inputKey] || { customerId: "", qty: 1 };
                    
                    return (
                      <tr key={`${i}-${j}`} style={{ background: a.podUpdatedForEmp ? "#e6ffe6" : "white" }}>
                        <td>{a.rootId || "-"}</td>
                        <td>{a.rmId || "-"}</td>
                        <td>{a.bmId || "-"}</td>
                        <td>{a.date}</td>
                        <td>{a.item}</td>
                        <td>
                          <div>
                            <span>Total: {safeNum(e.qty)}</span><br/>
                            <span style={{ color: "#f59e0b" }}>Used: {safeNum(e.usedQty)}</span><br/>
                            <span style={{ fontWeight: "bold", color: available > 0 ? "green" : "red" }}>
                              Avail: {available}
                            </span>
                          </div>
                        </td>
                        <td>{a.purpose}</td>
                        <td>{a.assignedBy}</td>
                        <td style={{ background: a.lrNo ? "#d1fae5" : "white" }}>
                          {a.lrNo ? (
                            <span style={{ fontWeight: "bold", color: "#059669" }}>
                              📦 {a.lrNo}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Pending</span>
                          )}
                        </td>
                        <td style={{ background: "#fef3c7", minWidth: 280 }}>
                          {available > 0 ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <input
                                type="text"
                                placeholder="Customer ID / Project Name"
                                value={currentInput.customerId}
                                onChange={(e) =>
                                  setUsedSampleInput((prev) => ({
                                    ...prev,
                                    [inputKey]: { ...currentInput, customerId: e.target.value },
                                  }))
                                }
                                style={{ 
                                  width: 140, 
                                  padding: "6px 8px", 
                                  fontSize: "12px",
                                  border: "1px solid #d97706",
                                  borderRadius: 4,
                                }}
                              />
                              <input
                                type="number"
                                min="1"
                                max={available}
                                placeholder="Qty"
                                value={currentInput.qty}
                                onChange={(e) =>
                                  setUsedSampleInput((prev) => ({
                                    ...prev,
                                    [inputKey]: { ...currentInput, qty: e.target.value },
                                  }))
                                }
                                style={{ 
                                  width: 50, 
                                  padding: "6px 4px", 
                                  fontSize: "12px",
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
                                  padding: "6px 12px",
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
        <p>⚠️ No assignment history found</p>
      )}

      {/* Used Samples History */}
      <h3 style={{ marginTop: 30 }}>📋 My Sample Usage History</h3>
      {history.some((a) =>
        (a.employees || []).some(
          (e) => e.empCode === user.empCode && e.usedSamples?.length > 0
        )
      ) ? (
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead style={{ background: "#d1fae5" }}>
            <tr>
              <th>Item</th>
              <th>Used Against (Customer ID / Project)</th>
              <th>Qty Used</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.flatMap((a) =>
              (a.employees || [])
                .filter((e) => e.empCode === user.empCode && e.usedSamples?.length > 0)
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
        <p style={{ color: "#6b7280" }}>⚠️ No samples used yet. Use samples against customers/projects from the table above.</p>
      )}
    </div>
  );
}
