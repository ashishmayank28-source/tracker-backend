// frontend/src/pages/ManagerAssets.jsx - Wrapper for Manager's Assets with tabs
import { useState } from "react";
import SampleBoardsAllocationManager from "./SampleBoardsAllocationManager.jsx";
import AssetRequest from "./AssetRequest.jsx";
import TeamAssignmentTable from "./TeamAssignmentTable.jsx";

export default function ManagerAssets() {
  const [activeTab, setActiveTab] = useState("sample"); // "sample", "request", or "teamTable"

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>🎁 Assets</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("sample")}
          style={{
            padding: "10px 24px",
            background: activeTab === "sample" ? "#3b82f6" : "#f1f5f9",
            color: activeTab === "sample" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📦 Sample Boards
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
        <button
          onClick={() => setActiveTab("teamTable")}
          style={{
            padding: "10px 24px",
            background: activeTab === "teamTable" ? "#8b5cf6" : "#f1f5f9",
            color: activeTab === "teamTable" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📊 Team Assignment Table
        </button>
      </div>

      {/* Sample Boards Tab */}
      {activeTab === "sample" && <SampleBoardsAllocationManager />}

      {/* Asset Request Tab */}
      {activeTab === "request" && <AssetRequest />}

      {/* Team Assignment Table Tab */}
      {activeTab === "teamTable" && <TeamAssignmentTable />}
    </div>
  );
}
