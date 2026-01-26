// frontend/src/pages/AssetRequest.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AssetRequest() {
  const { user, token } = useAuth();
  const [assetItems, setAssetItems] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("new"); // "new" or "history"

  // Form state
  const [selectedItems, setSelectedItems] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");

  // Fetch asset items for dropdown
  const fetchAssetItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAssetItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch asset items error:", err);
    }
  };

  // Fetch my requests
  const fetchMyRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch my requests error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssetItems();
      fetchMyRequests();
    }
  }, [token]);

  // Add item to selection
  const addItem = (itemName) => {
    if (!itemName) return;
    const existing = selectedItems.find((i) => i.itemName === itemName);
    if (!existing) {
      setSelectedItems([...selectedItems, { itemName, qty: 1 }]);
    }
  };

  // Remove item from selection
  const removeItem = (itemName) => {
    setSelectedItems(selectedItems.filter((i) => i.itemName !== itemName));
  };

  // Update quantity
  const updateQty = (itemName, qty) => {
    setSelectedItems(
      selectedItems.map((i) =>
        i.itemName === itemName ? { ...i, qty: Math.max(1, parseInt(qty) || 1) } : i
      )
    );
  };

  // Submit request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert("Please select at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: selectedItems,
          purpose,
          remarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Asset Request Submitted Successfully!");
        setSelectedItems([]);
        setPurpose("");
        setRemarks("");
        fetchMyRequests();
        setActiveTab("history");
      } else {
        alert("❌ " + (data.message || "Failed to submit request"));
      }
    } catch (err) {
      console.error("Submit request error:", err);
      alert("❌ Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return { bg: "#fef3c7", color: "#92400e" };
      case "BM Approved":
        return { bg: "#d1fae5", color: "#065f46" };
      case "BM Rejected":
        return { bg: "#fee2e2", color: "#991b1b" };
      case "Assigned":
        return { bg: "#dbeafe", color: "#1e40af" };
      case "Completed":
        return { bg: "#e0e7ff", color: "#3730a3" };
      default:
        return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20, color: "#1e293b" }}>📦 Asset Request</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("new")}
          style={{
            padding: "10px 24px",
            background: activeTab === "new" ? "#3b82f6" : "#f1f5f9",
            color: activeTab === "new" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ➕ New Request
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            padding: "10px 24px",
            background: activeTab === "history" ? "#3b82f6" : "#f1f5f9",
            color: activeTab === "history" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📋 My Requests ({myRequests.length})
        </button>
      </div>

      {/* New Request Form */}
      {activeTab === "new" && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Item Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>
                Select Items *
              </label>
              <select
                onChange={(e) => {
                  addItem(e.target.value);
                  e.target.value = "";
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                <option value="">-- Select Item to Add --</option>
                {assetItems
                  .filter((item) => !selectedItems.find((s) => s.itemName === item.name))
                  .map((item) => (
                    <option key={item._id} value={item.name}>
                      {item.name} {item.category ? `(${item.category})` : ""}
                    </option>
                  ))}
              </select>
            </div>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>
                  Selected Items ({selectedItems.length})
                </label>
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                          Item Name
                        </th>
                        <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e2e8f0", width: 100 }}>
                          Quantity
                        </th>
                        <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e2e8f0", width: 80 }}>
                          Remove
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, idx) => (
                        <tr key={item.itemName} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                            {item.itemName}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateQty(item.itemName, e.target.value)}
                              style={{
                                width: 60,
                                padding: "6px",
                                border: "1px solid #e2e8f0",
                                borderRadius: 4,
                                textAlign: "center",
                              }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => removeItem(item.itemName)}
                              style={{
                                background: "#fee2e2",
                                color: "#dc2626",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 10px",
                                cursor: "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Purpose */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>
                Purpose
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Enter purpose of request"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            {/* Remarks */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>
                Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional remarks..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0}
              style={{
                padding: "14px 32px",
                background: submitting || selectedItems.length === 0 ? "#94a3b8" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: submitting || selectedItems.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "📤 Submit Request"}
            </button>
          </form>
        </div>
      )}

      {/* Request History */}
      {activeTab === "history" && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {loading ? (
            <p>Loading...</p>
          ) : myRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              <p>No requests found. Create your first request!</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Request ID</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Date</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Items</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Purpose</th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>BM Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((req, idx) => {
                    const statusStyle = getStatusColor(req.status);
                    return (
                      <tr key={req._id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, color: "#3b82f6" }}>
                          {req.requestId}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                          {req.items?.map((i) => `${i.itemName} (${i.qty})`).join(", ")}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                          {req.purpose || "-"}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: statusStyle.bg,
                              color: statusStyle.color,
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                          {req.bmApproval?.remarks || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
