import { Link, Routes, Route } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import UsersTile from "./admin/UsersTile.jsx";
import AssetsTile from "./admin/AssetsTile.jsx";
import ReportDump from "./admin/ReportDump.jsx";
import ReportViewer from "../components/ReportsViewer.jsx";
import AssignmentLedger from "./admin/AssignmentLedger.jsx";
import AdminRevenueTracker from "./AdminRevenueTracker.jsx";
import AdminAttendance from "./admin/AdminAttendance.jsx";
import PerformanceReview from "./admin/PerformanceReview.jsx";

function Tile({ to, label }) {
  return (
    <Link
      to={to}
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 20,
        textAlign: "center",
        cursor: "pointer",
        background: "#f9f9f9",
        fontWeight: "bold",
        textDecoration: "none",
        color: "inherit",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </Link>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: "24px", fontWeight: "600" }}>⚙️ Admin Dashboard</h2>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>
              Hi <b>{user.name}</b> · {user.role}
            </span>
            <button
              onClick={logout}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
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

      {/* Main Tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 20,
        }}
      >
        <Tile to="users" label="👥 Users" />
        <Tile to="attendance" label="📅 Attendance" />
        <Tile to="performance" label="⭐ Performance Review" />
        <Tile to="reports" label="📊 Reports" />
        <Tile to="revenue" label="💰 Revenue" />
        <Tile to="assets" label="🎁 Assets" />
        <Tile to="retailers" label="🏬 Retailers DB" />
        <Tile to="daily" label="📝 Daily Tracker" />
        <Tile to="dump" label="🗂 Dump Management" />
        <Tile to="ledger" label="📊 Assignment Ledger" />
      </div>

      {/* Sub-Routes */}
      <div style={{ marginTop: 30 }}>
        <Routes>
          <Route path="users" element={<UsersTile />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="performance" element={<PerformanceReview />} />
          <Route path="assets" element={<AssetsTile />} />

          {/* ✅ Reports section */}
          <Route
            path="reports"
            element={
              <div>
                <h3>📊 Reports</h3>
                <ReportViewer /> {/* Admin → sees all users' reports */}
              </div>
            }
          />

          <Route path="revenue" element={<AdminRevenueTracker />} />
          <Route path="retailers" element={<h3>🏬 Retailers DB (coming soon)</h3>} />

          {/* ✅ Daily Tracker with ReportViewer */}
          <Route
            path="daily"
            element={
              <div>
                <h3>📝 Daily Tracker</h3>
                <ReportViewer /> {/* Same component reused */}
              </div>
            }
          />

          {/* 🔹 Dump Route */}
          <Route path="dump" element={<ReportDump />} />

          {/* ✅ Assignment Ledger (Tree View) */}
          <Route path="ledger" element={<AssignmentLedger />} />
        </Routes>
      </div>
    </div>
  );
}
