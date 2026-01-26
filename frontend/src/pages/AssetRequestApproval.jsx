// frontend/src/pages/AssetRequestApproval.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AssetRequestApproval() {
  const { user, token } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" or "all"
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [processing, setProcessing] = useState(false);

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/bm/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch pending requests error:", err);
    }
  };

  // Fetch all requests
  const fetchAllRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/bm/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch all requests error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPendingRequests();
      fetchAllRequests();
    }
  }, [token]);

  // Approve request
  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/bm/approve/${selectedRequest._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "approve", remarks }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Request Approved!");
        setSelectedRequest(null);
        setRemarks("");
        fetchPendingRequests();
        fetchAllRequests();
      } else {
        alert("❌ " + (data.message || "Failed to approve"));
      }
    } catch (err) {
      console.error("Approve error:", err);
      alert("❌ Error approving request");
    } finally {
      setProcessing(false);
    }
  };

  // Reject request
  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!remarks.trim()) {
      alert("Please provide remarks for rejection");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/bm/approve/${selectedRequest._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reject", remarks }),
      });
      const data = await res.json();
      if (data.success) {
        alert("❌ Request Rejected");
        setSelectedRequest(null);
        setRemarks("");
        fetchPendingRequests();
        fetchAllRequests();
      } else {
        alert("❌ " + (data.message || "Failed to reject"));
      }
    } catch (err) {
      console.error("Reject error:", err);
      alert("❌ Error rejecting request");
    } finally {
      setProcessing(false);
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

  const RequestTable = ({ requests, showActions = false }) => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Request ID</th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Date</th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Employee</th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Items</th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Purpose</th>
            <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Status</th>
            {showActions && (
              <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {requests.map((req, idx) => {
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
                  <div style={{ fontWeight: 600 }}>{req.empName}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{req.empCode}</div>
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
                {showActions && (
                  <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                    <button
                      onClick={() => setSelectedRequest(req)}
                      style={{
                        padding: "6px 14px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Review
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20, color: "#1e293b" }}>📦 Asset Request Approvals</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "10px 24px",
            background: activeTab === "pending" ? "#f59e0b" : "#f1f5f9",
            color: activeTab === "pending" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ⏳ Pending ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "10px 24px",
            background: activeTab === "all" ? "#3b82f6" : "#f1f5f9",
            color: activeTab === "all" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📋 All Requests ({allRequests.length})
        </button>
      </div>

      {/* Pending Tab */}
      {activeTab === "pending" && (
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
          ) : pendingRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
              <p>No pending requests!</p>
            </div>
          ) : (
            <RequestTable requests={pendingRequests} showActions={true} />
          )}
        </div>
      )}

      {/* All Tab */}
      {activeTab === "all" && (
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
          ) : allRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              <p>No requests found</p>
            </div>
          ) : (
            <RequestTable requests={allRequests} showActions={false} />
          )}
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: "95%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <h3 style={{ marginBottom: 20 }}>📋 Review Request - {selectedRequest.requestId}</h3>

            <div style={{ marginBottom: 16 }}>
              <strong>Employee:</strong> {selectedRequest.empName} ({selectedRequest.empCode})
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Date:</strong> {new Date(selectedRequest.createdAt).toLocaleDateString()}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Items:</strong>
              <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                {selectedRequest.items?.map((item, i) => (
                  <li key={i}>
                    {item.itemName} - <b>{item.qty}</b> qty
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Purpose:</strong> {selectedRequest.purpose || "-"}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Remarks from Requester:</strong> {selectedRequest.remarks || "-"}
            </div>

            {/* BM Remarks */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
                Your Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add your remarks (required for rejection)"
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

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleApprove}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: processing ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                ✅ Approve
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: processing ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                ❌ Reject
              </button>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRemarks("");
                }}
                style={{
                  padding: "12px 20px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
