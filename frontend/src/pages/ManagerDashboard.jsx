import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import ReportsViewer from "../components/ReportsViewer.jsx";
import SampleBoardsAllocationManager from "./SampleBoardsAllocationManager.jsx";
import RevenueTrackerManager from "./RevenueTrackerManager.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function ManagerDashboard() {
  const { user, token, logout } = useAuth();
  const [activeTile, setActiveTile] = useState("dashboard");
  const [reportees, setReportees] = useState([]);

  // 🔹 Load direct reportees (team members)
  useEffect(() => {
    async function loadReportees() {
      try {
        const res = await fetch(
          `${API_BASE}/api/users/team`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setReportees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading team:", err);
      }
    }
    if (user?.empCode) loadReportees();
  }, [user, token]);

  return (
    <div style={{ padding: 20 }}>
      {/* 🔹 Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: "bold" }}>
          📋 Manager Dashboard
        </h2>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>
              Hi <b>{user.name}</b> · {user.role}
            </span>
            <button
              onClick={logout}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                background: "#f44336",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* --- Dashboard Tiles --- */}
      {activeTile === "dashboard" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 20,
            marginTop: 20,
          }}
        >
          <Tile label="📅 Daily Tracker" onClick={() => setActiveTile("daily")} />
          <Tile label="👥 My Team" onClick={() => setActiveTile("team")} />
          <Tile label="📦 Sample Boards" onClick={() => setActiveTile("sample")} />
          <Tile label="💰 Revenue Tracker" onClick={() => setActiveTile("revenue")} /> 
        </div>
      )}

      {/* --- Daily Tracker (Shows Reportees' Submitted Reports) --- */}
      {activeTile === "daily" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>📅 Daily Tracker (Manager: {user?.name || "N/A"})</h3>
          <ReportsViewer />
        </TileWrapper>
      )}
      {/* --- 💰 Revenue Tracker --- */}
      {activeTile === "revenue" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <RevenueTrackerManager />
        </TileWrapper>
      )}

      {/* --- My Team --- */}
      {activeTile === "team" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>👥 My Team (Direct Employees)</h3>
          {reportees.length > 0 ? (
            <table
              border="1"
              cellPadding="6"
              style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th>EmpCode</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Area</th>
                </tr>
              </thead>
              <tbody>
                {reportees.map((u) => (
                  <tr key={u.empCode}>
                    <td>{u.empCode}</td>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>{u.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No employees assigned to you.</p>
          )}
        </TileWrapper>
      )}
      {/* Sample Boards */}
      {activeTile === "sample" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <SampleBoardsAllocationManager scope={user.role === "Employee" ? "self" : "team"} />
        </TileWrapper>
      )}


    </div>
  );
}

/* --- Reusable Tile --- */
function Tile({ label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 20,
        textAlign: "center",
        cursor: "pointer",
        background: "#f9f9f9",
        fontWeight: "bold",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </div>
  );
}

/* --- Wrapper with Back button --- */
function TileWrapper({ onBack, children }) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          marginBottom: 20,
          padding: "5px 12px",
          background: "#eee",
          border: "1px solid #ccc",
          borderRadius: 5,
          cursor: "pointer",
        }}
      >
        ← Back
      </button>
      {children}
    </div>
  );
}
