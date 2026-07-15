import { useEffect, useState } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RevenueApproverManager() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function loadAssignments() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/revenue/approver-assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, [token]);

  async function saveApprover(empCode, approverEmpCode) {
    try {
      const res = await fetch(`${API_BASE}/api/revenue/approver-assignments/${empCode}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approverEmpCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRows((prev) =>
          prev.map((r) =>
            r.empCode === empCode
              ? {
                  ...r,
                  revenueApproverEmpCode: data.revenueApproverEmpCode || "",
                  revenueApproverName: data.revenueApproverName || "",
                }
              : r
          )
        );
        setMessage(`✅ Approver updated for ${empCode}`);
      } else {
        setMessage(data.message || "Failed to update approver");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error saving approver");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.empName || "").toLowerCase().includes(q) ||
      (r.empCode || "").toLowerCase().includes(q) ||
      (r.branch || "").toLowerCase().includes(q) ||
      (r.region || "").toLowerCase().includes(q)
    );
  });

  if (loading) return <p style={{ padding: 20 }}>⏳ Loading revenue approver assignments...</p>;

  return (
    <div>
      <p style={{ color: "#475569", marginBottom: 16, fontSize: 14 }}>
        Har employee ke liye revenue approver select karein — Immediate Manager, Branch Manager, ya Regional Manager.
        Jo select hoga, wahi us employee ki revenue entries approve kar payega.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        <button onClick={loadAssignments} style={btnBlue}>🔄 Refresh</button>
        {message && <span style={{ fontWeight: 600, color: message.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{message}</span>}
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Emp Code</th>
              <th style={th}>Employee Name</th>
              <th style={th}>Branch</th>
              <th style={th}>Region</th>
              <th style={thGreen}>Revenue Approver</th>
              <th style={th}>Current Approver</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 20 }}>No employees found</td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.empCode} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={td}>{r.empCode}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.empName}</td>
                  <td style={td}>{r.branch || "-"}</td>
                  <td style={td}>{r.region || "-"}</td>
                  <td style={td}>
                    <select
                      value={r.revenueApproverEmpCode || ""}
                      onChange={(e) => saveApprover(r.empCode, e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">— Select Approver —</option>
                      {(r.approverOptions || []).map((opt) => (
                        <option key={opt.empCode} value={opt.empCode}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {(!r.approverOptions || r.approverOptions.length === 0) && (
                      <span style={{ fontSize: 11, color: "#dc2626" }}>No managers linked</span>
                    )}
                  </td>
                  <td style={td}>
                    {r.revenueApproverName ? (
                      <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 12 }}>{r.revenueApproverName}</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Not assigned</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 900 };
const th = { padding: "10px 12px", textAlign: "left", background: "#f8fafc", borderBottom: "2px solid #e2e8f0", fontSize: 12, fontWeight: 600 };
const thGreen = { ...th, background: "#dcfce7" };
const td = { padding: "10px 12px", fontSize: 12, verticalAlign: "middle" };
const inputStyle = { padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", minWidth: 220 };
const selectStyle = { padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", minWidth: 280, fontSize: 12 };
const btnBlue = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 12 };
