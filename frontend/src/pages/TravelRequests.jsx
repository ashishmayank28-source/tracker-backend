import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function TravelRequests({ isAdmin = false }) {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | approved | rejected
  const [message, setMessage] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Load requests
  useEffect(() => {
    loadRequests();
  }, [token, isAdmin]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const endpoint = isAdmin ? "/api/tour/all-requests" : "/api/tour/manager-requests";
      console.log("🔍 Loading tour requests from:", endpoint, "isAdmin:", isAdmin, "userRole:", user?.role);
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("📡 API Response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ API Error:", errorData);
        setMessage(`❌ ${errorData.message || "Failed to load requests"}`);
        setRequests([]);
        return;
      }
      
      const data = await res.json();
      console.log("✅ Tour requests loaded:", data.length || 0, data);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading requests:", err);
      setMessage("❌ Network error loading requests");
    } finally {
      setLoading(false);
    }
  };

  // Approve request
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/tour/approve/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMessage("✅ Request approved successfully!");
        loadRequests();
      } else {
        setMessage("❌ Failed to approve request");
      }
    } catch (err) {
      setMessage("❌ Error approving request");
    }
  };

  // Reject request
  const handleReject = async () => {
    if (!rejectModal) return;

    try {
      const res = await fetch(`${API_BASE}/api/tour/reject/${rejectModal}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (res.ok) {
        setMessage("❌ Request rejected");
        setRejectModal(null);
        setRejectReason("");
        loadRequests();
      }
    } catch (err) {
      setMessage("❌ Error rejecting request");
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status.toLowerCase() === filter;
  });

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "Pending").length,
    approved: requests.filter(r => r.status === "Approved").length,
    rejected: requests.filter(r => r.status === "Rejected").length,
    completed: requests.filter(r => r.status === "Completed").length,
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: { bg: "#fef3c7", color: "#d97706", icon: "⏳" },
      Approved: { bg: "#dcfce7", color: "#16a34a", icon: "✅" },
      Rejected: { bg: "#fee2e2", color: "#dc2626", icon: "❌" },
      Completed: { bg: "#dbeafe", color: "#2563eb", icon: "✔️" },
    };
    const s = styles[status] || { bg: "#f3f4f6", color: "#6b7280", icon: "•" };
    return (
      <span style={{
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}>
        {s.icon} {status}
      </span>
    );
  };

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          ✈️ Travel Requests
        </h2>
        <button onClick={loadRequests} style={refreshBtn}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards - Responsive */}
      <div style={statsGridResponsive}>
        <div style={statCardSmall("#f0f9ff", "#0284c7")}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.total}</span>
          <span style={{ fontSize: 11 }}>Total</span>
        </div>
        <div style={statCardSmall("#fef3c7", "#d97706")}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.pending}</span>
          <span style={{ fontSize: 11 }}>Pending</span>
        </div>
        <div style={statCardSmall("#dcfce7", "#16a34a")}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.approved}</span>
          <span style={{ fontSize: 11 }}>Approved</span>
        </div>
        <div style={statCardSmall("#fee2e2", "#dc2626")}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.rejected}</span>
          <span style={{ fontSize: 11 }}>Rejected</span>
        </div>
        <div style={statCardSmall("#dbeafe", "#2563eb")}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.completed}</span>
          <span style={{ fontSize: 11 }}>Completed</span>
        </div>
      </div>

      {/* Filter Tabs - Scrollable on Mobile */}
      <div style={filterContainer}>
        {["all", "pending", "approved", "rejected", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={filterBtn(filter === f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {message && (
        <div style={{
          padding: "10px 16px",
          marginBottom: 16,
          borderRadius: 8,
          background: message.includes("✅") ? "#dcfce7" : "#fee2e2",
          color: message.includes("✅") ? "#166534" : "#dc2626",
        }}>
          {message}
        </div>
      )}

      {/* Requests Table */}
      {loading ? (
        <p>Loading...</p>
      ) : filteredRequests.length === 0 ? (
        <div style={emptyState}>
          <span style={{ fontSize: 48 }}>✈️</span>
          <p>No travel requests found</p>
        </div>
      ) : (
        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={th}>Employee</th>
                <th style={th}>Branch</th>
                <th style={th}>Destination</th>
                <th style={th}>Purpose</th>
                <th style={th}>Request Date</th>
                <th style={th}>Status</th>
                <th style={th}>Expenses</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={td}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{req.empName}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{req.empCode}</div>
                    </div>
                  </td>
                  <td style={td}>{req.branch || "-"}</td>
                  <td style={td}>
                    <span style={{ fontWeight: 500 }}>📍 {req.toLocation}</span>
                  </td>
                  <td style={{ ...td, maxWidth: 200 }}>
                    <span style={{ fontSize: 12 }}>{req.purpose}</span>
                  </td>
                  <td style={td}>
                    {new Date(req.requestDate).toLocaleDateString()}
                  </td>
                  <td style={td}>{getStatusBadge(req.status)}</td>
                  <td style={td}>
                    {req.expensesFilled ? (
                      <div style={{ fontSize: 12 }}>
                        <div>Travel: ₹{req.travelExpense}</div>
                        <div>Food: ₹{req.foodExpense}</div>
                        <div>Stay: ₹{req.accommodationExpense}</div>
                        <div style={{ fontWeight: 600, color: "#2563eb" }}>
                          Total: ₹{req.totalExpense}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>-</span>
                    )}
                  </td>
                  <td style={td}>
                    {req.status === "Pending" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleApprove(req._id)}
                          style={approveBtn}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => setRejectModal(req._id)}
                          style={rejectBtn}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                    {req.status === "Approved" && req.approvedBy && (
                      <span style={{ fontSize: 11, color: "#16a34a" }}>
                        By: {req.approvedBy}
                      </span>
                    )}
                    {req.status === "Rejected" && req.rejectReason && (
                      <span style={{ fontSize: 11, color: "#dc2626" }}>
                        {req.rejectReason}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: "0 0 16px" }}>❌ Reject Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={textareaStyle}
              rows={3}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={handleReject} style={rejectBtn}>
                Confirm Reject
              </button>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                style={cancelBtn}
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

// Styles

// ✅ Responsive header
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  flexWrap: "wrap",
  gap: 10,
};

const refreshBtn = {
  padding: "8px 14px",
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
};

// ✅ Responsive Stats Grid - Scrollable on Mobile
const statsGridResponsive = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  overflowX: "auto",
  paddingBottom: 8,
  WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
};

// ✅ Smaller stat cards for mobile
const statCardSmall = (bg, color) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "12px 16px",
  background: bg,
  borderRadius: 10,
  color: color,
  minWidth: 70,
  flexShrink: 0, // Prevent shrinking on mobile
});

// ✅ Filter container - Scrollable
const filterContainer = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
  overflowX: "auto",
  paddingBottom: 8,
  WebkitOverflowScrolling: "touch",
};

const filterBtn = (active) => ({
  padding: "8px 14px",
  border: "none",
  borderRadius: 8,
  background: active ? "#2563eb" : "#f3f4f6",
  color: active ? "#fff" : "#374151",
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 12,
  whiteSpace: "nowrap", // Prevent text wrapping
  flexShrink: 0,
});

// ✅ Table wrapper for horizontal scroll on mobile
const tableWrapper = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  borderRadius: 8,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const tableStyle = {
  width: "100%",
  minWidth: 800, // Ensure table has minimum width for proper display
  borderCollapse: "collapse",
  background: "#fff",
};

const th = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
};

const td = {
  padding: "12px 14px",
  fontSize: 13,
};

const approveBtn = {
  padding: "6px 12px",
  background: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const rejectBtn = {
  padding: "6px 12px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const cancelBtn = {
  padding: "6px 12px",
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

const emptyState = {
  textAlign: "center",
  padding: 60,
  background: "#f9fafb",
  borderRadius: 12,
  color: "#6b7280",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContent = {
  background: "#fff",
  padding: 24,
  borderRadius: 12,
  width: 400,
  maxWidth: "90%",
};

const textareaStyle = {
  width: "100%",
  padding: 12,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  resize: "vertical",
};

