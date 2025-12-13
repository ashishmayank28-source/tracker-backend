import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function VendorDashboard() {
  const { token, logout, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState({ id: "", emp: "", item: "" });

  /* 🔹 Fetch vendor assignments (only Project/Marketing & sent ones) */
  async function fetchAssignments() {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/vendor/list?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Vendor fetch error:", err);
    }
  }

  useEffect(() => {
    if (token) fetchAssignments();
  }, [token]);

  /* 🔹 Update LR No. - Now uses specific ID (bmId/rmId/rootId) */
  async function handleLRUpdate(assignmentId, lrNo) {
    if (!lrNo.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/assignments/vendor/lr/${assignmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lrNo }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("✅ LR No. Updated Successfully");
        // Update LR in state - match by bmId, rmId, or rootId
        setAssignments((prev) =>
          prev.map((a) => {
            const aId = a.bmId || a.rmId || a.rootId;
            return aId === assignmentId ? { ...a, lrNo } : a;
          })
        );
      } else {
        alert(data.message || "❌ Failed to update LR No.");
      }
    } catch (err) {
      console.error("LR update error:", err);
      alert("❌ Network or Server error while updating LR No.");
    }
  }

  /* 🔹 Filtered table */
  const filtered = assignments
    .filter((a) =>
      (a.rootId || "").toLowerCase().includes(filter.id.toLowerCase())
    )
    .filter((a) =>
      (a.item || "").toLowerCase().includes(filter.item.toLowerCase())
    );

  return (
    <div style={{ padding: 30, background: "#f8f9fa", minHeight: "100vh" }}>
      {/* 🔹 Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: "bold" }}>🚚 Vendor Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: "500" }}>{user?.name || "Vendor"}</span>
          <button
            onClick={logout}
            style={{
              padding: "6px 14px",
              background: "#e63946",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
          <button
            onClick={fetchAssignments}
            style={{
              padding: "6px 14px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          justifyContent: "center",
        }}
      >
        <input
          type="text"
          placeholder="Filter by Root ID"
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, id: e.target.value }))
          }
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            flex: 1,
            maxWidth: 200,
          }}
        />
        <input
          type="text"
          placeholder="Filter by Employee"
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, emp: e.target.value }))
          }
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            flex: 1,
            maxWidth: 200,
          }}
        />
        <input
          type="text"
          placeholder="Filter by Item"
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, item: e.target.value }))
          }
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            flex: 1,
            maxWidth: 200,
          }}
        />
      </div>

      {/* Vendor Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "white",
            border: "1px solid #ddd",
          }}
        >
          <thead>
            <tr style={{ background: "#f1f3f5", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Root ID</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>BM ID</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Date</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Item</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Employee</th>
              <th style={{ padding: "10px", border: "1px solid #ddd", background: "#e8f5e9" }}>📍 Courier Address</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Qty</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Purpose</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Assigned By</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>LR No.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) =>
              (a.employees || [])
                .filter((emp) =>
                  (emp.name || "")
                    .toLowerCase()
                    .includes(filter.emp.toLowerCase())
                )
                .map((emp, j) => (
                  <tr key={`${i}-${j}`} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{a.rootId}</td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{a.bmId || "-"}</td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{a.date}</td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{a.item}</td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                      {emp.name} ({emp.empCode})
                    </td>
                    {/* ✅ Courier Address from Employee Profile */}
                    <td style={{ padding: "8px", border: "1px solid #ddd", background: "#f1f8e9", fontSize: 12 }}>
                      {emp.courierAddress || "-"}
                    </td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{emp.qty}</td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        color: a.purpose === "Project/Marketing" ? "green" : "gray",
                        fontWeight: "bold",
                      }}
                    >
                      {a.purpose}
                    </td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                      {a.assignedBy}
                    </td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>
  {(() => {
    // Use most specific ID: bmId > rmId > rootId
    const updateId = a.bmId || a.rmId || a.rootId;
    const inputId = `vendor-lr-${updateId}-${j}`;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <input
          type="text"
          placeholder="Enter LR No"
          defaultValue={a.lrNo || ""}
          id={inputId}
          style={{
            width: "100px",
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: 4,
          }}
        />
        <button
          onClick={() => {
            const val = document.getElementById(inputId).value.trim();
            if (!val) return alert("Please enter LR No first!");
            handleLRUpdate(updateId, val);
          }}
          style={{
            background: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          Update
        </button>
      </div>
    );
  })()}
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
