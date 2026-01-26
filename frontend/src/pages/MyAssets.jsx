import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import AssetRequest from "./AssetRequest.jsx"; // ✅ Asset Request Component

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";
const safeNum = (v) => (isNaN(v) || v == null ? 0 : Number(v));

export default function MyAssets() {
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState("stock"); // "stock" or "request"
  const [stock, setStock] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  /* 🔹 Fetch Employee Stock + History */
  useEffect(() => {
    async function fetchEmployeeStock() {
      try {
        const res = await fetch(`${API_BASE}/api/assignments/employee/${user.empCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch employee stock");
        const data = await res.json();
        setStock(data.stock || []);
        setAssignments(data.assignments || []);
      } catch (err) {
        console.error("Employee stock fetch error:", err);
        setStock([]);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    }
    if (token && user?.empCode) fetchEmployeeStock();
  }, [token, user]);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>🎁 My Assets</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("stock")}
          style={{
            padding: "10px 24px",
            background: activeTab === "stock" ? "#3b82f6" : "#f1f5f9",
            color: activeTab === "stock" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📦 My Stock
        </button>
        <button
          onClick={() => setActiveTab("request")}
          style={{
            padding: "10px 24px",
            background: activeTab === "request" ? "#f97316" : "#f1f5f9",
            color: activeTab === "request" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📋 Asset Request
        </button>
      </div>

      {/* My Stock Tab */}
      {activeTab === "stock" && (
        <div>
          {loading ? (
            <p>⏳ Loading your stock...</p>
          ) : (
            <>
              {/* 🔹 Current Stock */}
              <h3 style={{ marginBottom: 15 }}>📊 My Current Stock</h3>
              {stock.length > 0 ? (
                <div style={{ overflowX: "auto", marginBottom: 30 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Item</th>
                        <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Available Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((s, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600, color: "#22c55e" }}>
                            {safeNum(s.stock)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "#64748b" }}>⚠️ No stock assigned yet</p>
              )}

              {/* 🔹 Assignment History */}
              <h3 style={{ marginBottom: 15 }}>📑 My Assignment History</h3>
              {assignments.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Root ID</th>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>RM ID</th>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>BM ID</th>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Date</th>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Item</th>
                        <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Qty</th>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Purpose</th>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Assigned By</th>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>LR No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) =>
                        (a.employees || [])
                          .filter((e) => e.empCode === user.empCode)
                          .map((e, j) => (
                            <tr key={`${i}-${j}`} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 11 }}>{a.rootId || "-"}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>{a.rmId || "-"}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>{a.bmId || "-"}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>{a.date}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>{a.item}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600, color: "#f59e0b" }}>{safeNum(e.qty)}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>{a.purpose}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>{a.assignedBy}</td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>{a.lrNo || "-"}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "#64748b" }}>⚠️ No assignment history found.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Asset Request Tab */}
      {activeTab === "request" && <AssetRequest />}
    </div>
  );
}
