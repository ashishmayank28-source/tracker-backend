// frontend/src/pages/GuestDashboard.jsx
import { useState } from "react";
import { useAuth } from "../auth.jsx";

// Import all tile components (same as AdminDashboard)
import UsersTile from "./admin/UsersTile.jsx";
import UserDetailsTile from "./admin/UserDetailsTile.jsx";
import UserProfileManager from "./admin/UserProfileManager.jsx";
import AssetsTile from "./admin/AssetsTile.jsx";
import ReportDump from "./admin/ReportDump.jsx";
import ReportViewer from "../components/ReportsViewer.jsx";
import AssignmentLedger from "./admin/AssignmentLedger.jsx";
import AssignmentTable from "./admin/AssignmentTable.jsx";
import AdminRevenueTracker from "./AdminRevenueTracker.jsx";
import AdminAttendance from "./admin/AdminAttendance.jsx";
import PerformanceReview from "./admin/PerformanceReview.jsx";
import RetailerDatabaseTeam from "./RetailerDatabaseTeam.jsx";
import TravelRequests from "./TravelRequests.jsx";
import CustomerDatabase from "./customerDatabase/CustomerDatabase.jsx"; // ✅ Customer Database

// ✅ All available tiles with their components
const TILE_CONFIG = {
  users: { label: "👥 Users", color: "#3b82f6", component: UsersTile },
  "user-details": { label: "📋 User Details", color: "#8b5cf6", component: UserDetailsTile },
  "user-profiles": { label: "✏️ User Profiles", color: "#f97316", component: UserProfileManager },
  attendance: { label: "📅 Attendance", color: "#10b981", component: AdminAttendance },
  performance: { label: "⭐ Performance", color: "#f59e0b", component: PerformanceReview },
  daily: { label: "📝 Daily Tracker", color: "#06b6d4", component: ReportViewer },
  revenue: { label: "💰 Revenue", color: "#22c55e", component: AdminRevenueTracker },
  assets: { label: "🎁 Assets", color: "#ec4899", component: AssetsTile },
  retailers: { label: "🏬 Retailers DB", color: "#6366f1", component: RetailerDatabaseTeam },
  customerDatabase: { label: "📋 Customer DB", color: "#84cc16", component: CustomerDatabase }, // ✅ NEW
  dump: { label: "🗂 Dump Management", color: "#ef4444", component: ReportDump },
  ledger: { label: "📊 Assignment Ledger", color: "#14b8a6", component: AssignmentLedger },
  "assignment-table": { label: "📋 Assignment Table", color: "#a855f7", component: AssignmentTable },
  travel: { label: "✈️ Travel Requests", color: "#0ea5e9", component: TravelRequests },
};

export default function GuestDashboard() {
  const { user, logout } = useAuth() || {};
  const [activeTile, setActiveTile] = useState("dashboard");

  // ✅ Get allowed tiles from user object (saved during login)
  const allowedTiles = user?.allowedTiles || [];

  // ✅ Filter tiles based on permissions
  const visibleTiles = allowedTiles
    .filter((id) => TILE_CONFIG[id])
    .map((id) => ({ id, ...TILE_CONFIG[id] }));

  // ✅ Get active tile component
  const ActiveComponent = TILE_CONFIG[activeTile]?.component;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0 }}>
            👤 Guest Dashboard
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Welcome, {user?.name || "Guest"} | Limited Access
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: "10px 20px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Logout
        </button>
      </div>

      {/* Dashboard Tiles */}
      {activeTile === "dashboard" && (
        <>
          {visibleTiles.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px dashed #e2e8f0",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
              <h3 style={{ color: "#475569", marginBottom: 8 }}>
                No Access Granted
              </h3>
              <p style={{ color: "#94a3b8", maxWidth: 400, margin: "0 auto" }}>
                The admin has not granted you access to any features yet. Please
                contact the administrator for access.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 20,
              }}
            >
              {visibleTiles.map((tile) => (
                <Tile
                  key={tile.id}
                  label={tile.label}
                  onClick={() => setActiveTile(tile.id)}
                  color={tile.color}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Active Tile Content - Read Only for Guest */}
      {activeTile !== "dashboard" && ActiveComponent && (
        <TileWrapper
          title={TILE_CONFIG[activeTile]?.label || ""}
          onBack={() => setActiveTile("dashboard")}
        >
          <ActiveComponent isAdmin={true} readOnly={true} isGuest={true} />
        </TileWrapper>
      )}
    </div>
  );
}

/* --- Reusable Tile Component --- */
function Tile({ label, onClick, color = "#3b82f6" }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 12,
        padding: 24,
        textAlign: "center",
        cursor: "pointer",
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        fontWeight: "600",
        fontSize: 15,
        color: "#1e293b",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        borderLeft: `4px solid ${color}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
      }}
    >
      {label}
    </div>
  );
}

/* --- Wrapper with Back button --- */
function TileWrapper({ title, onBack, children }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 15,
          marginBottom: 20,
          paddingBottom: 15,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back
        </button>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
