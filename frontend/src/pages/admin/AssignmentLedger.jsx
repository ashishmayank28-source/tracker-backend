import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AssignmentLedger() {
  const { token } = useAuth();
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoots, setExpandedRoots] = useState({});
  const [filter, setFilter] = useState("");

  const fetchLedger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/ledger`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch ledger");
      const data = await res.json();
      setLedger(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ledger fetch error:", err);
      setLedger([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ✅ Fetch on mount and when token changes
  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const toggleExpand = (rootId) => {
    setExpandedRoots((prev) => ({ ...prev, [rootId]: !prev[rootId] }));
  };

  const expandAll = () => {
    const all = {};
    ledger.forEach((l) => (all[l.rootId] = true));
    setExpandedRoots(all);
  };

  const collapseAll = () => setExpandedRoots({});

  // Filter ledger
  const filteredLedger = ledger.filter((l) =>
    !filter ||
    l.rootId?.toLowerCase().includes(filter.toLowerCase()) ||
    l.item?.toLowerCase().includes(filter.toLowerCase()) ||
    l.assignedBy?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <p>Loading ledger...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Assignment Ledger (Tree View)</h2>

      {/* Controls */}
      <div style={{ marginBottom: 15, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={fetchLedger} style={btnStyle("#10b981")}>
          🔄 Refresh
        </button>
        <input
          type="text"
          placeholder="🔍 Search by Root ID, Item, or Assigned By..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "8px 12px", width: 300, border: "1px solid #ccc", borderRadius: 4 }}
        />
        <button onClick={expandAll} style={btnStyle("#2563eb")}>
          ➕ Expand All
        </button>
        <button onClick={collapseAll} style={btnStyle("#6b7280")}>
          ➖ Collapse All
        </button>
      </div>

      {filteredLedger.length === 0 ? (
        <p>No assignments found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {filteredLedger.map((root) => (
            <RootNode
              key={root.rootId}
              root={root}
              expanded={expandedRoots[root.rootId]}
              onToggle={() => toggleExpand(root.rootId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* 🔹 Root Node (Admin Level) */
function RootNode({ root, expanded, onToggle }) {
  // Calculate total used samples
  const getTotalUsed = (employees) => {
    return (employees || []).reduce((sum, emp) => sum + (emp.usedQty || 0), 0);
  };
  const totalUsed = getTotalUsed(root.employees);

  return (
    <div
      style={{
        border: "2px solid #3b82f6",
        borderRadius: 8,
        background: "#eff6ff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: "12px 16px",
          background: "#3b82f6",
          color: "white",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong>🔵 {root.rootId}</strong> | {root.item} | {root.purpose}
          {root.toVendor && <span style={{ marginLeft: 10, background: "#22c55e", padding: "2px 8px", borderRadius: 4 }}>✅ To Vendor</span>}
          {root.lrNo && <span style={{ marginLeft: 10, background: "#f59e0b", padding: "2px 8px", borderRadius: 4 }}>📦 LR: {root.lrNo}</span>}
          {totalUsed > 0 && <span style={{ marginLeft: 10, background: "#ef4444", padding: "2px 8px", borderRadius: 4 }}>📝 Used: {totalUsed}</span>}
        </div>
        <span style={{ fontSize: 18 }}>{expanded ? "▼" : "▶"}</span>
      </div>

      {/* Content */}
      {expanded && (
        <div style={{ padding: 15 }}>
          {/* Admin Employees */}
          <div style={{ marginBottom: 10 }}>
            <strong>👥 Assigned to:</strong>
            <EmployeeList employees={root.employees} />
          </div>

          <p style={{ fontSize: 12, color: "#6b7280" }}>
            Assigned by: {root.assignedBy} | Date: {root.date}
          </p>

          {/* RM Children */}
          {root.children?.length > 0 && (
            <div style={{ marginTop: 15 }}>
              {root.children.map((rm, i) => (
                <RMNode key={i} rm={rm} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* 🔹 RM Node */
function RMNode({ rm }) {
  const [expanded, setExpanded] = useState(false);
  const totalUsed = (rm.employees || []).reduce((sum, emp) => sum + (emp.usedQty || 0), 0);

  return (
    <div
      style={{
        border: "2px solid #8b5cf6",
        borderRadius: 6,
        background: "#f5f3ff",
        marginBottom: 10,
        marginLeft: 20,
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 12px",
          background: "#8b5cf6",
          color: "white",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          🟣 {rm.rmId} | {rm.item} | {rm.purpose}
          {totalUsed > 0 && <span style={{ marginLeft: 10, background: "#ef4444", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>Used: {totalUsed}</span>}
        </span>
        <span>{expanded ? "▼" : "▶"}</span>
      </div>

      {expanded && (
        <div style={{ padding: 10 }}>
          <strong>👥 Assigned to:</strong>
          <EmployeeList employees={rm.employees} />
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            Assigned by: {rm.assignedBy} | Date: {rm.date}
          </p>

          {/* BM Children */}
          {rm.children?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {rm.children.map((bm, i) => (
                <BMNode key={i} bm={bm} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* 🔹 BM Node */
function BMNode({ bm }) {
  const [expanded, setExpanded] = useState(false);
  const totalUsed = (bm.employees || []).reduce((sum, emp) => sum + (emp.usedQty || 0), 0);

  return (
    <div
      style={{
        border: "2px solid #f59e0b",
        borderRadius: 6,
        background: "#fffbeb",
        marginBottom: 8,
        marginLeft: 20,
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          background: "#f59e0b",
          color: "white",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          🟠 {bm.bmId} | {bm.item} | {bm.purpose}
          {totalUsed > 0 && <span style={{ marginLeft: 10, background: "#ef4444", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>Used: {totalUsed}</span>}
        </span>
        <span>{expanded ? "▼" : "▶"}</span>
      </div>

      {expanded && (
        <div style={{ padding: 10 }}>
          <strong>👥 Assigned to:</strong>
          <EmployeeList employees={bm.employees} />
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            Assigned by: {bm.assignedBy} | Date: {bm.date}
          </p>

          {/* Manager Children */}
          {bm.children?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {bm.children.map((mgr, i) => (
                <ManagerNode key={i} mgr={mgr} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* 🔹 Manager Node */
function ManagerNode({ mgr }) {
  const [expanded, setExpanded] = useState(false);
  const totalUsed = (mgr.employees || []).reduce((sum, emp) => sum + (emp.usedQty || 0), 0);

  return (
    <div
      style={{
        border: "2px solid #22c55e",
        borderRadius: 6,
        background: "#f0fdf4",
        marginBottom: 8,
        marginLeft: 20,
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          background: "#22c55e",
          color: "white",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          🟢 {mgr.managerId} | {mgr.item} | {mgr.purpose}
          {totalUsed > 0 && <span style={{ marginLeft: 10, background: "#ef4444", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>Used: {totalUsed}</span>}
        </span>
        <span>{expanded ? "▼" : "▶"}</span>
      </div>

      {expanded && (
        <div style={{ padding: 10 }}>
          <strong>👥 Assigned to:</strong>
          <EmployeeList employees={mgr.employees} />
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            Assigned by: {mgr.assignedBy} | Date: {mgr.date}
          </p>
        </div>
      )}
    </div>
  );
}

/* 🔹 Employee List with Used Samples */
function EmployeeList({ employees }) {
  return (
    <div style={{ marginTop: 8 }}>
      {(employees || []).map((emp, i) => {
        const available = (emp.qty || 0) - (emp.usedQty || 0);
        const hasUsedSamples = emp.usedSamples?.length > 0;
        
        return (
          <div 
            key={i} 
            style={{ 
              background: "#fff", 
              border: "1px solid #e5e7eb", 
              borderRadius: 6, 
              padding: 10, 
              marginBottom: 8,
            }}
          >
            {/* Employee Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{emp.name}</strong> ({emp.empCode})
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ background: "#dbeafe", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                  Total: {emp.qty || 0}
                </span>
                <span style={{ background: "#fef3c7", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                  Used: {emp.usedQty || 0}
                </span>
                <span style={{ 
                  background: available > 0 ? "#d1fae5" : "#fee2e2", 
                  padding: "2px 8px", 
                  borderRadius: 4, 
                  fontSize: 12,
                  fontWeight: "bold",
                }}>
                  Avail: {available}
                </span>
              </div>
            </div>
            
            {/* Used Samples Details */}
            {hasUsedSamples && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: "bold", color: "#f59e0b", marginBottom: 4 }}>
                  📝 Used Against:
                </div>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fef3c7" }}>
                      <th style={{ padding: "4px 8px", textAlign: "left", border: "1px solid #e5e7eb" }}>Customer/Project</th>
                      <th style={{ padding: "4px 8px", textAlign: "center", border: "1px solid #e5e7eb", width: 60 }}>Qty</th>
                      <th style={{ padding: "4px 8px", textAlign: "center", border: "1px solid #e5e7eb", width: 100 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emp.usedSamples.map((us, j) => (
                      <tr key={j}>
                        <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", fontWeight: "bold", color: "#1d4ed8" }}>
                          {us.customerId}
                        </td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                          {us.qty}
                        </td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                          {us.usedAt ? new Date(us.usedAt).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* 🔹 Button Style Helper */
function btnStyle(bg) {
  return {
    padding: "8px 14px",
    background: bg,
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  };
}

