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
  
  // ✅ Expense verification states
  const [verifyModal, setVerifyModal] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [rejectExpenseModal, setRejectExpenseModal] = useState(null);
  const [rejectExpenseReason, setRejectExpenseReason] = useState("");

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

  // ✅ Verify Expenses
  const handleVerifyExpense = async () => {
    if (!verifyModal) return;

    try {
      const res = await fetch(`${API_BASE}/api/tour/verify-expense/${verifyModal}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verificationRemarks: verifyRemarks }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Expenses verified! Tour marked as completed.");
        setVerifyModal(null);
        setVerifyRemarks("");
        loadRequests();
      } else {
        setMessage(`❌ ${data.message || "Failed to verify expenses"}`);
      }
    } catch (err) {
      setMessage("❌ Error verifying expenses");
    }
  };

  // ✅ Reject Expenses
  const handleRejectExpense = async () => {
    if (!rejectExpenseModal) return;

    try {
      const res = await fetch(`${API_BASE}/api/tour/reject-expense/${rejectExpenseModal}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectExpenseReason }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("❌ Expenses rejected. Employee can resubmit.");
        setRejectExpenseModal(null);
        setRejectExpenseReason("");
        loadRequests();
      } else {
        setMessage(`❌ ${data.message || "Failed to reject expenses"}`);
      }
    } catch (err) {
      setMessage("❌ Error rejecting expenses");
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "expensesubmitted") return r.status === "ExpenseSubmitted";
    return r.status.toLowerCase() === filter;
  });

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "Pending").length,
    approved: requests.filter(r => r.status === "Approved").length,
    expenseSubmitted: requests.filter(r => r.status === "ExpenseSubmitted").length,
    rejected: requests.filter(r => r.status === "Rejected").length,
    completed: requests.filter(r => r.status === "Completed").length,
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: { bg: "#fef3c7", color: "#d97706", icon: "⏳", label: "Pending" },
      Approved: { bg: "#dcfce7", color: "#16a34a", icon: "✅", label: "Approved" },
      ExpenseSubmitted: { bg: "#e0e7ff", color: "#4338ca", icon: "📄", label: "Expense Pending" },
      Verified: { bg: "#d1fae5", color: "#065f46", icon: "✓", label: "Verified" },
      Rejected: { bg: "#fee2e2", color: "#dc2626", icon: "❌", label: "Rejected" },
      Completed: { bg: "#dbeafe", color: "#2563eb", icon: "🎉", label: "Completed" },
    };
    const s = styles[status] || { bg: "#f3f4f6", color: "#6b7280", icon: "•", label: status };
    return (
      <span style={{
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}>
        {s.icon} {s.label}
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
        <div style={statCardSmall("#e0e7ff", "#4338ca")}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.expenseSubmitted}</span>
          <span style={{ fontSize: 11 }}>📄 Verify</span>
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
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "expensesubmitted", label: "📄 Verify Expense" },
          { key: "rejected", label: "Rejected" },
          { key: "completed", label: "Completed" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={filterBtn(filter === f.key)}
          >
            {f.label}
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

      {/* Requests - Card Layout for Mobile */}
      {loading ? (
        <p>Loading...</p>
      ) : filteredRequests.length === 0 ? (
        <div style={emptyState}>
          <span style={{ fontSize: 48 }}>✈️</span>
          <p>No travel requests found</p>
        </div>
      ) : (
        <div style={cardsContainer}>
          {filteredRequests.map((req) => (
            <div key={req._id} style={requestCard}>
              {/* Header - Employee Info + Status */}
              <div style={cardHeader}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{req.empName}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{req.empCode} • {req.branch || "-"}</div>
                </div>
                {getStatusBadge(req.status)}
              </div>

              {/* Destination & Purpose */}
              <div style={cardBody}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <span style={{ fontWeight: 600, color: "#1f2937" }}>{req.toLocation}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  {req.purpose}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  Requested: {new Date(req.requestDate).toLocaleDateString()}
                  {req.approvedBy && (
                    <span> • Approved by: {req.approvedBy}</span>
                  )}
                </div>
              </div>

              {/* Expenses if filled */}
              {(req.totalExpense > 0 || req.travelExpense > 0) && (
                <div style={expenseRow}>
                  <div style={expenseItem}>
                    <span>🚗</span>
                    <span>Travel:</span>
                    <span style={{ fontWeight: 600 }}>₹{req.travelExpense || 0}</span>
                  </div>
                  <div style={expenseItem}>
                    <span>🍽️</span>
                    <span>Food:</span>
                    <span style={{ fontWeight: 600 }}>₹{req.foodExpense || 0}</span>
                  </div>
                  <div style={expenseItem}>
                    <span>🏨</span>
                    <span>Stay:</span>
                    <span style={{ fontWeight: 600 }}>₹{req.accommodationExpense || 0}</span>
                  </div>
                  <div style={{ ...expenseItem, background: "#dbeafe", borderRadius: 6, padding: "4px 8px" }}>
                    <span>💰</span>
                    <span>Total:</span>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>₹{req.totalExpense || 0}</span>
                  </div>
                </div>
              )}

              {/* ✅ Uploaded Documents */}
              {(req.billsUrl || req.ticketsUrl || req.invoicesUrl) && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {req.billsUrl && (
                    <a href={`${API_BASE}${req.billsUrl}`} target="_blank" rel="noreferrer" style={docLink}>
                      🧾 Bills
                    </a>
                  )}
                  {req.ticketsUrl && (
                    <a href={`${API_BASE}${req.ticketsUrl}`} target="_blank" rel="noreferrer" style={docLink}>
                      🎫 Tickets
                    </a>
                  )}
                  {req.invoicesUrl && (
                    <a href={`${API_BASE}${req.invoicesUrl}`} target="_blank" rel="noreferrer" style={docLink}>
                      📋 Invoices
                    </a>
                  )}
                </div>
              )}

              {/* Actions - Pending Approval */}
              {req.status === "Pending" && (
                <div style={cardActions}>
                  <button onClick={() => handleApprove(req._id)} style={approveBtn}>
                    ✅ Approve
                  </button>
                  <button onClick={() => setRejectModal(req._id)} style={rejectBtn}>
                    ❌ Reject
                  </button>
                </div>
              )}

              {/* ✅ Actions - Expense Verification */}
              {req.status === "ExpenseSubmitted" && (
                <div style={cardActions}>
                  <button onClick={() => setVerifyModal(req._id)} style={verifyBtn}>
                    ✓ Verify Expense
                  </button>
                  <button onClick={() => setRejectExpenseModal(req._id)} style={rejectBtn}>
                    ❌ Reject Expense
                  </button>
                </div>
              )}

              {/* Verification Info */}
              {req.expenseVerified && (
                <div style={{ padding: "8px 12px", background: "#d1fae5", borderRadius: 6, fontSize: 12, color: "#065f46", marginTop: 8 }}>
                  ✓ Verified by: {req.verifiedBy} on {new Date(req.verifiedDate).toLocaleDateString()}
                </div>
              )}

              {/* Rejection Reason */}
              {req.status === "Rejected" && req.rejectReason && (
                <div style={{ padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#dc2626", marginTop: 8 }}>
                  ❌ Reason: {req.rejectReason}
                </div>
              )}
            </div>
          ))}
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

      {/* ✅ Verify Expense Modal */}
      {verifyModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: "0 0 16px", color: "#065f46" }}>✓ Verify Expenses</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
              Please review the submitted bills, tickets, and invoices before verifying.
            </p>
            <textarea
              value={verifyRemarks}
              onChange={(e) => setVerifyRemarks(e.target.value)}
              placeholder="Verification remarks (optional)..."
              style={textareaStyle}
              rows={2}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={handleVerifyExpense} style={verifyBtn}>
                ✓ Confirm Verification
              </button>
              <button
                onClick={() => {
                  setVerifyModal(null);
                  setVerifyRemarks("");
                }}
                style={cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ❌ Reject Expense Modal */}
      {rejectExpenseModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: "0 0 16px", color: "#dc2626" }}>❌ Reject Expenses</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
              Employee will be able to resubmit expenses after rejection.
            </p>
            <textarea
              value={rejectExpenseReason}
              onChange={(e) => setRejectExpenseReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
              style={textareaStyle}
              rows={3}
              required
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={handleRejectExpense} style={rejectBtn}>
                ❌ Confirm Reject
              </button>
              <button
                onClick={() => {
                  setRejectExpenseModal(null);
                  setRejectExpenseReason("");
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

const verifyBtn = {
  padding: "6px 12px",
  background: "#0d9488",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const docLink = {
  padding: "4px 10px",
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 11,
  color: "#374151",
  textDecoration: "none",
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

// ✅ Card-based layout for mobile-friendly display
const cardsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const requestCard = {
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  border: "1px solid #e5e7eb",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
  paddingBottom: 12,
  borderBottom: "1px solid #f3f4f6",
};

const cardBody = {
  marginBottom: 8,
};

const expenseRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px dashed #e5e7eb",
};

const expenseItem = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  color: "#4b5563",
};

const cardActions = {
  display: "flex",
  gap: 10,
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid #e5e7eb",
};

