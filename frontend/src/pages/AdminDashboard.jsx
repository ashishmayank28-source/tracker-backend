import { useState } from "react";
import { useAuth } from "../auth.jsx";
import UsersTile from "./admin/UsersTile.jsx";
import UserDetailsTile from "./admin/UserDetailsTile.jsx";
import UserProfileManager from "./admin/UserProfileManager.jsx";
import AssetsTile from "./admin/AssetsTile.jsx";
import ReportDump from "./admin/ReportDump.jsx";
import ReportViewer from "../components/ReportsViewer.jsx";
import AssignmentLedger from "./admin/AssignmentLedger.jsx";
import AssignmentTable from "./admin/AssignmentTable.jsx";
import AdminRevenueTracker from "./AdminRevenueTracker.jsx";
import RevenueApproverManager from "./admin/RevenueApproverManager.jsx";
import AdminAttendance from "./admin/AdminAttendance.jsx";
import PerformanceReview from "./admin/PerformanceReview.jsx";
import RetailerDatabaseTeam from "./RetailerDatabaseTeam.jsx";
import TravelRequests from "./TravelRequests.jsx";
import CustomerDatabase from "./customerDatabase/CustomerDatabase.jsx"; // ✅ Customer Database
import ItemNamesManager from "./admin/ItemNamesManager.jsx";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTile, setActiveTile] = useState("dashboard");

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0 }}>
          ⚙️ Admin Dashboard
        </h2>
      </div>

      {/* Dashboard Tiles */}
      {activeTile === "dashboard" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 20,
          }}
        >
          <Tile label="👥 Users" onClick={() => setActiveTile("users")} color="#3b82f6" />
          <Tile label="📋 User Details" onClick={() => setActiveTile("user-details")} color="#8b5cf6" />
          <Tile label="✏️ User Profiles" onClick={() => setActiveTile("user-profiles")} color="#f97316" />
          <Tile label="📅 Attendance" onClick={() => setActiveTile("attendance")} color="#10b981" />
          <Tile label="⭐ Performance" onClick={() => setActiveTile("performance")} color="#f59e0b" />
          <Tile label="📝 Daily Tracker" onClick={() => setActiveTile("daily")} color="#06b6d4" />
          <Tile label="💰 Revenue" onClick={() => setActiveTile("revenue")} color="#22c55e" />
          <Tile label="📦 Item Names" onClick={() => setActiveTile("item-names")} color="#84cc16" />
          <Tile label="🎁 Assets" onClick={() => setActiveTile("assets")} color="#ec4899" />
          <Tile label="📋 Customer DB" onClick={() => setActiveTile("customerDB")} color="#6366f1" />
          <Tile label="🗂 Dump Management" onClick={() => setActiveTile("dump")} color="#ef4444" />
          <Tile label="📊 Assignment Ledger" onClick={() => setActiveTile("ledger")} color="#14b8a6" />
          <Tile label="📋 Assignment Table" onClick={() => setActiveTile("assignment-table")} color="#a855f7" />
          <Tile label="✈️ Travel Requests" onClick={() => setActiveTile("travel")} color="#0ea5e9" />
        </div>
      )}

      {/* Users Management */}
      {activeTile === "users" && (
        <TileWrapper title="👥 Manage Users" onBack={() => setActiveTile("dashboard")}>
          <UsersTile />
        </TileWrapper>
      )}

      {/* User Details */}
      {activeTile === "user-details" && (
        <TileWrapper title="📋 User Details" onBack={() => setActiveTile("dashboard")}>
          <UserDetailsTile />
        </TileWrapper>
      )}

      {/* User Profile Manager */}
      {activeTile === "user-profiles" && (
        <TileWrapper title="✏️ User Profile Manager" onBack={() => setActiveTile("dashboard")}>
          <UserProfileManager />
        </TileWrapper>
      )}

      {/* Attendance */}
      {activeTile === "attendance" && (
        <TileWrapper title="📅 Attendance" onBack={() => setActiveTile("dashboard")}>
          <AdminAttendance />
        </TileWrapper>
      )}

      {/* Performance Review */}
      {activeTile === "performance" && (
        <TileWrapper title="⭐ Performance Review" onBack={() => setActiveTile("dashboard")}>
          <PerformanceReview />
        </TileWrapper>
      )}

      {/* Daily Tracker */}
      {activeTile === "daily" && (
        <TileWrapper title="📝 Daily Tracker" onBack={() => setActiveTile("dashboard")}>
          <ReportViewer />
        </TileWrapper>
      )}

      {/* Revenue sub-menu */}
      {activeTile === "revenue" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 20,
          }}
        >
          <Tile label="💰 Revenue Tracker" onClick={() => setActiveTile("revenue-tracker")} color="#22c55e" />
          <Tile label="✅ Revenue Approver" onClick={() => setActiveTile("revenue-approver")} color="#16a34a" />
          <Tile label="← Back" onClick={() => setActiveTile("dashboard")} color="#64748b" />
        </div>
      )}

      {activeTile === "revenue-tracker" && (
        <TileWrapper title="💰 Revenue Tracker" onBack={() => setActiveTile("revenue")}>
          <AdminRevenueTracker />
        </TileWrapper>
      )}

      {activeTile === "revenue-approver" && (
        <TileWrapper title="✅ Revenue Approver" onBack={() => setActiveTile("revenue")}>
          <RevenueApproverManager />
        </TileWrapper>
      )}

      {/* Item Names */}
      {activeTile === "item-names" && (
        <TileWrapper title="📦 Order Won Item Names" onBack={() => setActiveTile("dashboard")}>
          <ItemNamesManager />
        </TileWrapper>
      )}

      {/* Assets */}
      {activeTile === "assets" && (
        <TileWrapper title="🎁 Assets Management" onBack={() => setActiveTile("dashboard")}>
          <AssetsTile />
        </TileWrapper>
      )}

      {/* 📋 Customer Database */}
      {activeTile === "customerDB" && (
        <TileWrapper title="📋 Customer Database" onBack={() => setActiveTile("dashboard")}>
          <CustomerDatabase onBack={() => setActiveTile("dashboard")} />
        </TileWrapper>
      )}

      {/* Dump Management */}
      {activeTile === "dump" && (
        <TileWrapper title="🗂 Dump Management" onBack={() => setActiveTile("dashboard")}>
          <ReportDump />
        </TileWrapper>
      )}

      {/* Assignment Ledger */}
      {activeTile === "ledger" && (
        <TileWrapper title="📊 Assignment Ledger" onBack={() => setActiveTile("dashboard")}>
          <AssignmentLedger />
        </TileWrapper>
      )}

      {/* Assignment Table */}
      {activeTile === "assignment-table" && (
        <TileWrapper title="📋 Assignment Table" onBack={() => setActiveTile("dashboard")}>
          <AssignmentTable />
        </TileWrapper>
      )}

      {/* ✈️ Travel Requests */}
      {activeTile === "travel" && (
        <TileWrapper title="✈️ Travel Requests" onBack={() => setActiveTile("dashboard")}>
          <TravelRequests isAdmin={true} />
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
