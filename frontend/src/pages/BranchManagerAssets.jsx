// frontend/src/pages/BranchManagerAssets.jsx - Wrapper for BM's Assets with tabs
import { useState } from "react";
import SampleBoardsAllocationBranch from "./SampleBoardsAllocationBranch.jsx";
import AssetRequestApproval from "./AssetRequestApproval.jsx";

export default function BranchManagerAssets() {
  const [activeTab, setActiveTab] = useState("sample"); // "sample" or "approval"

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>🎁 Assets</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
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
          onClick={() => setActiveTab("approval")}
          style={{
            padding: "10px 24px",
            background: activeTab === "approval" ? "#f97316" : "#f1f5f9",
            color: activeTab === "approval" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📋 Asset Approvals
        </button>
      </div>

      {/* Sample Boards Tab */}
      {activeTab === "sample" && <SampleBoardsAllocationBranch />}

      {/* Asset Request Approval Tab */}
      {activeTab === "approval" && <AssetRequestApproval />}
    </div>
  );
}
