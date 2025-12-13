import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import ReportsViewer from "../components/ReportsViewer.jsx";
import SampleBoardsAllocationBranch from "./SampleBoardsAllocationBranch.jsx";
import RevenueTrackerBranch from "./RevenueTrackerBranch.jsx";
import PerformanceReviewBranch from "./PerformanceReviewBranch.jsx";
import RetailerDatabaseTeam from "./RetailerDatabaseTeam.jsx";
import TravelRequests from "./TravelRequests.jsx"; 

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function BranchManagerDashboard() {
  const { user, logout, token } = useAuth();
  const [activeTile, setActiveTile] = useState("dashboard");
  const [reportees, setReportees] = useState([]);

  // 🔹 Load team from API
  useEffect(() => {
    async function loadTeam() {
      try {
        const res = await fetch(`${API_BASE}/api/users/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setReportees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading team:", err);
      }
    }
    if (token) loadTeam();
  }, [token]);

  return (
    <div style={{ padding: 20 }}>
      {/* 🔹 Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
          🏢 Branch Manager Dashboard
        </h2>
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
          <Tile label="💰 Revenue" onClick={() => setActiveTile("revenue")} />
          <Tile label="👥 My Team" onClick={() => setActiveTile("team")} />
          <Tile label="📦 Sample Boards" onClick={() => setActiveTile("sample")} />
          <Tile label="🏬 Retailer DB" onClick={() => setActiveTile("retailer")} />
          <Tile label="⭐ Performance Review" onClick={() => setActiveTile("performance")} />
          <Tile label="✈️ Travel Requests" onClick={() => setActiveTile("travel")} />
        </div>
      )}

      {/* --- Daily Tracker --- */}
      {activeTile === "daily" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>📅 Daily Tracker (Branch: {user?.branch || "N/A"})</h3>
          <ReportsViewer />
        </TileWrapper>
      )}

      {/* --- Revenue --- */}
      {activeTile === "revenue" && (
  <TileWrapper onBack={() => setActiveTile("dashboard")}>
    <h3>💰 Revenue Tracker (Branch: {user?.branch || "N/A"})</h3>
    <RevenueTrackerBranch />  {/* 🧩 Load actual page instead of placeholder */}
  </TileWrapper>
)}

      {/* --- My Team --- */}
      {activeTile === "team" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>👥 My Team (Branch: {user?.branch || "N/A"})</h3>
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
                  <th>Branch</th>
                </tr>
              </thead>
              <tbody>
                {reportees.map((u) => (
                  <tr key={u.empCode}>
                    <td>{u.empCode}</td>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>{u.branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No users found under your branch.</p>
          )}
        </TileWrapper>
      )}

      {/* --- Sample Boards --- */}
      {activeTile === "sample" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <SampleBoardsAllocationBranch />
        </TileWrapper>
      )}

      {/* --- Retailer Database --- */}
      {activeTile === "retailer" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>🏬 Retailer Database (Branch: {user?.branch || "N/A"})</h3>
          <RetailerDatabaseTeam />
        </TileWrapper>
      )}

      {/* --- Performance Review --- */}
      {activeTile === "performance" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <PerformanceReviewBranch />
        </TileWrapper>
      )}

      {/* ✈️ Travel Requests */}
      {activeTile === "travel" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <TravelRequests />
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
