// frontend/src/components/AssetsTable.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AssetsTable({ type }) {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadAssets() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assets/ledger?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load assets:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [type]);

  const th = {
    border: "1px solid #ddd",
    padding: "6px",
    background: "#f5f5f5",
    fontWeight: "600",
    fontSize: "13px",
  };
  const td = { border: "1px solid #ddd", padding: "6px", fontSize: "13px" };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 15 }}>
        📦 {type === "sampleBoard" ? "Sample Boards" : type === "gift" ? "Gifts" : "Company Assets"}
      </h2>

      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No assets found</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Assignment ID</th>
              <th style={th}>Emp Code</th>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}>Branch</th>
              <th style={th}>Region</th>
              <th style={th}>Asset Name</th>
              <th style={th}>Quantity</th>
              <th style={th}>LR Details</th>
              <th style={th}>Remark</th>
              <th style={th}>Usage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) =>
              row.assignments.map((a, j) => (
                <tr key={`${i}-${j}`}>
                  <td style={td}>{a.assignmentId}</td>
                  <td style={td}>{row.empCode}</td>
                  <td style={td}>{row.name}</td>
                  <td style={td}>{row.role}</td>
                  <td style={td}>{row.branch}</td>
                  <td style={td}>{row.region}</td>
                  <td style={td}>{a.assetName}</td>
                  <td style={td}>{a.qty}</td>
                  <td style={td}>{row.lrDetails || "-"}</td>
                  <td style={td}>{row.remark || "-"}</td>
                  <td style={td}>{row.usage || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
