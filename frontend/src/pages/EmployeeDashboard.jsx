import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import { useParams } from "react-router-dom";
import MyReports from "./MyReports.jsx";
import AttendanceStatus from "./AttendanceStatus.jsx";
import RetailerDatabase from "./RetailerDatabase.jsx";
import Notifications from "./Notifications.jsx";
import MyAssets from "./MyAssets.jsx";
import RevenueTrackerEmp from "./RevenueTrackerEmp.jsx";
import AddRetailer from "./AddRetailer.jsx";
import CustomerDatabase from "./customerDatabase/CustomerDatabase.jsx"; // ✅ New Customer Database

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function EmployeeDashboard({ readOnly = false }) {
  const { user, logout, token } = useAuth();
  const { empCode: routeEmp } = useParams();
  const targetEmp = readOnly ? routeEmp : user?.empCode;

  const [empData, setEmpData] = useState(null);
  const [activeTile, setActiveTile] = useState("dashboard");

  useEffect(() => {
    async function loadData() {
      if (!targetEmp) return;
      try {
        const res = await fetch(`${API_BASE}/api/users/${targetEmp}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEmpData(data);
      } catch (err) {
        console.error("Error loading employee:", err);
      }
    }
    loadData();
  }, [targetEmp, token]);

  if (!empData) return <p>Loading…</p>;

  return (
    <div style={{ padding: 20 }}>
      {/* --- Header --- */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
          {readOnly
            ? `👤 Viewing ${empData.name || targetEmp}'s Dashboard`
            : "👷 Employee Dashboard"}
        </h2>
        {readOnly && (
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            Viewing as {user?.role}
          </p>
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
          <Tile label="📋 My Reports" onClick={() => setActiveTile("reports")} />
          <Tile label="📅 Attendance" onClick={() => setActiveTile("attendance")} />
          <Tile label="💰 Revenue" onClick={() => setActiveTile("revenue")} />
          <Tile label="🎁 Assets" onClick={() => setActiveTile("assets")} />
          <Tile label="📋 Customer DB" onClick={() => setActiveTile("customerDatabase")} />
          <Tile label="🔔 Notifications" onClick={() => setActiveTile("notifications")} />
        </div>
      )}

      {/* --- Reports --- */}
      {activeTile === "reports" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
         <h3>📋 My Reports</h3>
          <MyReports readOnly={readOnly} />
        </TileWrapper>
      )}

      {/* --- Attendance --- */}
      {activeTile === "attendance" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>📅 Attendance Status</h3>
          <AttendanceStatus readOnly={readOnly} />
        </TileWrapper>
      )}

      {activeTile === "revenue" && (
  <TileWrapper onBack={() => setActiveTile("dashboard")}>
    <h3>💰 Revenue Tracker</h3>
    <RevenueTrackerEmp readOnly={readOnly} />
  </TileWrapper>
)}

      {/* --- Assets (with tabs for Stock + Asset Request) --- */}
      {activeTile === "assets" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <MyAssets />
        </TileWrapper>
      )}

      {/* 📋 Customer Database */}
      {activeTile === "customerDatabase" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <CustomerDatabase onBack={() => setActiveTile("dashboard")} />
        </TileWrapper>
      )}

      {/* --- Notifications --- */}
      {activeTile === "notifications" && (
        <TileWrapper onBack={() => setActiveTile("dashboard")}>
          <h3>🔔 Notifications</h3>
          <Notifications />
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
