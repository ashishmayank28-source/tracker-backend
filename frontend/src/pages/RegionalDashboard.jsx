import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import ReportsViewer from "../components/ReportsViewer.jsx";
import SampleBoardsAllocationRegional from "./SampleBoardsAllocationRegional.jsx";
import RegionalRevenueTracker from "./RegionalRevenueTracker.jsx";
import PerformanceReviewRegional from "./PerformanceReviewRegional.jsx";
import RetailerDatabaseTeam from "./RetailerDatabaseTeam.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RegionalDashboard() {
  const { user, logout, token } = useAuth();
  const [activeTile, setActiveTile] = useState("dashboard");

  // API-based regional team
  const [apiTeam, setApiTeam] = useState([]);
  useEffect(() => {
    async function fetchRegionalTeam() {
      try {
        const res = await fetch(`${API_BASE}/api/users/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setApiTeam(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch regional team:", err);
      }
    }
    if (user?.role === "RegionalManager") fetchRegionalTeam();
  }, [token, user]);

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: "bold" }}>
          🌍 Regional Manager Dashboard
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

      {/* Dashboard Tiles */}
      {activeTile === "dashboard" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 20,
              marginTop: 20,
              marginBottom: 30,
            }}
          >
            <Tile label="📅 Daily Tracker" onClick={() => setActiveTile("daily")} />
            <Tile label="💰 Revenue" onClick={() => setActiveTile("revenue")} />
            <Tile label="📦 Sample Boards" onClick={() => setActiveTile("assets")} />
            <Tile label="🏬 Retailer DB" onClick={() => setActiveTile("retailer")} />
            <Tile label="⭐ Performance Review" onClick={() => setActiveTile("performance")} />
          </div>

          {/* My Team */}
          <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 15 }}>
            <h3 style={{ marginBottom: 10, fontSize: "18px" }}>👥 My Team</h3>
            {apiTeam.length === 0 ? (
              <p style={{ color: "gray" }}>No team members found.</p>
            ) : (
              <UserTable list={apiTeam} />
            )}
          </div>
        </>
      )}

      {/* Daily Tracker - Now shows ReportsViewer */}
      {activeTile === "daily" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <ReportsViewer />
        </TileWrapper>
      )}

      {/* Assets - Sample Boards */}
      {activeTile === "assets" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <SampleBoardsAllocationRegional />
        </TileWrapper>
      )}


      {/* ✅ Revenue Tracker */}
      {activeTile === "revenue" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>💰 Revenue Tracker (Region: {user?.region || "N/A"})</h3>
          <RegionalRevenueTracker />
        </TileWrapper>
      )}

      {/* Retailer Database */}
      {activeTile === "retailer" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>🏬 Retailer Database (Region: {user?.region || "N/A"})</h3>
          <RetailerDatabaseTeam />
        </TileWrapper>
      )}

      {/* ✅ Performance Review */}
      {activeTile === "performance" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <PerformanceReviewRegional />
        </TileWrapper>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */
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
      }}
    >
      {label}
    </div>
  );
}

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

function UserTable({ list }) {
  const safeNum = (v) => (isNaN(v) || v == null ? 0 : Number(v));
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
      <thead style={{ background: "#f5f5f5" }}>
        <tr>
          {["EmpCode", "Name", "Role", "Branch", "Area"].map((h) => (
            <th key={h} style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {list.map((u, i) => (
          <tr key={u.empCode} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
            <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.empCode}</td>
            <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.name}</td>
            <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.role}</td>
            <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.branch || "-"}</td>
            <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.area || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
