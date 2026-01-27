// frontend/src/pages/RegionalAssets.jsx - Regional Manager's Assets with Assignment Table
import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RegionalAssets() {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    lot: "all",
    search: "",
  });

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const lots = ["all", "Lot 1", "Lot 2", "Lot 3"];

  // Fetch regional assignments
  useEffect(() => {
    async function fetchAssignments() {
      try {
        setLoading(true);
        // Use existing regional/stock endpoint
        const res = await fetch(`${API_BASE}/api/assignments/regional/stock`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Filter by year and lot on frontend
          let filtered = data.assignments || [];
          if (filters.year) {
            filtered = filtered.filter(a => {
              const aYear = a.year || new Date(a.date).getFullYear();
              return aYear === filters.year;
            });
          }
          if (filters.lot !== "all") {
            filtered = filtered.filter(a => a.lot === filters.lot);
          }
          setAssignments(filtered);
        }
      } catch (err) {
        console.error("Regional assignments fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchAssignments();
  }, [token, user, filters.year, filters.lot]);

  // Filter by search
  const filtered = assignments.filter((a) => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return (
      (a.item || "").toLowerCase().includes(s) ||
      (a.assignedBy || "").toLowerCase().includes(s) ||
      (a.employees || []).some(
        (e) =>
          (e.empCode || "").toLowerCase().includes(s) ||
          (e.empName || "").toLowerCase().includes(s)
      )
    );
  });

  // Calculate totals
  const totalQty = filtered.reduce((sum, a) => {
    return sum + (a.employees || []).reduce((s, e) => s + (e.qty || 0), 0);
  }, 0);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>🎁 Regional Assets - Assignment Table</h2>
      <p style={{ color: "#64748b", marginBottom: 20 }}>
        Region: <b style={{ color: "#3b82f6" }}>{user?.region || "N/A"}</b>
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 15, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label style={{ fontSize: 13, color: "#64748b" }}>Year:</label>
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
            style={{ marginLeft: 8, padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#64748b" }}>Lot:</label>
          <select
            value={filters.lot}
            onChange={(e) => setFilters({ ...filters, lot: e.target.value })}
            style={{ marginLeft: 8, padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            {lots.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <input
            type="text"
            placeholder="🔍 Search item, employee..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", width: 220 }}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={{ 
        display: "flex", 
        gap: 20, 
        marginBottom: 20, 
        padding: 15, 
        background: "linear-gradient(135deg, #3b82f615, #3b82f605)", 
        borderRadius: 12,
        borderLeft: "4px solid #3b82f6"
      }}>
        <div>
          <span style={{ color: "#64748b", fontSize: 13 }}>Total Assignments:</span>
          <span style={{ marginLeft: 8, fontWeight: 700, color: "#1e293b" }}>{filtered.length}</span>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 13 }}>Total Qty Issued:</span>
          <span style={{ marginLeft: 8, fontWeight: 700, color: "#f59e0b" }}>{totalQty}</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Loading assignments...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
          <p>No assignments found for your region.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#3b82f6", color: "white" }}>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Assignment ID</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Item</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Year/Lot</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Employee</th>
                <th style={{ padding: "12px 8px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Purpose</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>Assigned By</th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>LR No.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) =>
                (a.employees || []).map((emp, eIdx) => (
                  <tr key={`${a._id}-${eIdx}`} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    {eIdx === 0 && (
                      <>
                        <td rowSpan={a.employees.length} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>
                          {a.rootId || a._id?.slice(-8) || "-"}
                        </td>
                        <td rowSpan={a.employees.length} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {a.date ? new Date(a.date).toLocaleDateString() : "-"}
                        </td>
                        <td rowSpan={a.employees.length} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, color: "#1e293b" }}>
                          {a.item}
                        </td>
                        <td rowSpan={a.employees.length} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>
                          {a.year || "-"} / {a.lot || "-"}
                        </td>
                      </>
                    )}
                    <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ fontWeight: 600, color: "#3b82f6" }}>{emp.empCode}</span>
                      <span style={{ marginLeft: 6, color: "#64748b" }}>{emp.empName}</span>
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600, color: "#f59e0b" }}>
                      {emp.qty || 0}
                    </td>
                    {eIdx === 0 && (
                      <>
                        <td rowSpan={a.employees.length} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {a.purpose || "-"}
                        </td>
                        <td rowSpan={a.employees.length} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {a.assignedBy || "-"}
                        </td>
                        <td rowSpan={a.employees.length} style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {a.lrNo || "-"}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
