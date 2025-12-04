import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";
const safeNum = (v) => (isNaN(v) || v == null ? 0 : Number(v));

export default function MyAssets() {
  const { user, token } = useAuth();

  const [stock, setStock] = useState([]);         // Employee stock
  const [assignments, setAssignments] = useState([]); // Employee assignment history
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
    if (token && user?.role === "Employee") fetchEmployeeStock();
  }, [token, user]);

  if (loading) return <p>⏳ Loading your stock...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 My Allocated Sample Boards</h2>

      {/* 🔹 Current Stock */}
      <h3>📊 My Current Stock</h3>
      {stock.length > 0 ? (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Available Qty</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td>{safeNum(s.stock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>⚠️ No stock assigned yet</p>
      )}

      {/* 🔹 Assignment History */}
      <h3 style={{ marginTop: 30 }}>📑 My Assignment History</h3>
      {assignments.length > 0 ? (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th>Root ID</th>
              <th>RM ID</th>
              <th>BM ID</th>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Purpose</th>
              <th>Assigned By</th>
              <th>LR Details (From Vendor)</th> {/* ✅ New Column */}
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) =>
              (a.employees || [])
                .filter((e) => e.empCode === user.empCode)
                .map((e, j) => (
                  <tr key={`${i}-${j}`}>
                    <td>{a.rootId || "-"}</td>
                    <td>{a.rmId || "-"}</td>        {/* ✅ Added RM ID */}
                    <td>{a.bmId || "-"}</td>        {/* ✅ Added BM ID */}
                    <td>{a.date}</td>
                    <td>{a.item}</td>
                    <td>{safeNum(e.qty)}</td>
                    <td>{a.purpose}</td>
                    <td>{a.assignedBy}</td>
                    <td>{a.lrNo || "-"}</td>        {/* ✅ Added LR Details */}
                  </tr>
                ))
            )}
          </tbody>
        </table>
      ) : (
        <p>⚠️ No assignment history found.</p>
      )}
    </div>
  );
}
