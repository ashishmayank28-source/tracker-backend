import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function TravelRequests({ isAdmin = false }) {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | approved | rejected | reimburse
  const [message, setMessage] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // ✅ Expense verification states
  const [verifyModal, setVerifyModal] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [rejectExpenseModal, setRejectExpenseModal] = useState(null);
  const [rejectExpenseReason, setRejectExpenseReason] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Load requests
  useEffect(() => {
    loadRequests();
  }, [token, isAdmin]);

  const loadRequests = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
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
      const nextRequests = Array.isArray(data) ? data : [];
      setRequests(nextRequests);
      setSelectedIds((prev) =>
        prev.filter((id) =>
          nextRequests.some((r) => r._id === id && r.status === "Completed" && !r.reimbursed)
        )
      );
    } catch (err) {
      console.error("Error loading requests:", err);
      setMessage("❌ Network error loading requests");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const applyLocalReimburse = (ids, meta = {}) => {
    const idSet = new Set(ids);
    const reimbursedBy =
      meta.reimbursedBy || (user ? `${user.empCode} - ${user.name}` : "Admin");
    const reimbursedDate = meta.reimbursedDate || new Date().toISOString();
    setRequests((prev) =>
      prev.map((r) =>
        idSet.has(r._id)
          ? { ...r, reimbursed: true, reimbursedBy, reimbursedDate }
          : r
      )
    );
    setSelectedIds((prev) => prev.filter((id) => !idSet.has(id)));
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

  // ✅ Mark as Reimbursed (Admin only)
  const handleMarkReimbursed = async (id) => {
    if (!window.confirm("Mark this tour as reimbursed? (Already paid with salary)")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tour/reimburse/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Tour marked as reimbursed!");
        applyLocalReimburse([id], {
          reimbursedBy: data.data?.reimbursedBy,
          reimbursedDate: data.data?.reimbursedDate,
        });
      } else {
        setMessage(`❌ ${data.message || "Failed to mark as reimbursed"}`);
      }
    } catch (err) {
      setMessage("❌ Error marking as reimbursed");
    }
  };

  const isEligibleForReimburse = (r) => r.status === "Completed" && !r.reimbursed;

  const handleBulkReimburse = async () => {
    const eligibleSelected = requests.filter(
      (r) => selectedIds.includes(r._id) && isEligibleForReimburse(r)
    );
    if (!eligibleSelected.length) {
      setMessage("❌ No eligible requests selected");
      setBulkConfirm(false);
      return;
    }

    try {
      setBulkLoading(true);
      const res = await fetch(`${API_BASE}/api/tour/reimburse/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: eligibleSelected.map((r) => r._id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.message || "Failed to process bulk reimbursement"}`);
        return;
      }

      const failed = (data.results || []).filter((r) => !r.success);
      const successIds = (data.results || []).filter((r) => r.success).map((r) => r.id);
      if (data.failCount === 0) {
        setMessage(`✅ ${data.message || `${data.successCount} tours marked as reimbursed.`}`);
      } else if (data.successCount === 0) {
        setMessage(`❌ ${data.message || "No tours were marked as reimbursed."}${failed[0]?.message ? ` ${failed[0].message}` : ""}`);
      } else {
        setMessage(`⚠️ ${data.message} ${failed.map((f) => f.empCode || f.id).join(", ")}`);
      }
      if (successIds.length) {
        applyLocalReimburse(successIds);
      } else if (data.successCount > 0) {
        applyLocalReimburse(eligibleSelected.map((r) => r._id));
      } else {
        setSelectedIds([]);
      }
      setBulkConfirm(false);
    } catch (err) {
      setMessage("❌ Error processing bulk reimbursement");
    } finally {
      setBulkLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "expensesubmitted") return r.status === "ExpenseSubmitted";
    if (filter === "reimburse") return r.status === "Completed" && !r.reimbursed;
    if (filter === "reimbursed") return !!r.reimbursed;
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
    toReimburse: requests.filter(r => r.status === "Completed" && !r.reimbursed).length,
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");
  const eligibleInView = isAdmin ? filteredRequests.filter(isEligibleForReimburse) : [];
  const allEligibleSelected =
    eligibleInView.length > 0 && eligibleInView.every((r) => selectedIds.includes(r._id));
  const selectedRecords = requests.filter(
    (r) => selectedIds.includes(r._id) && isEligibleForReimburse(r)
  );
  const selectedTotal = selectedRecords.reduce((sum, r) => sum + (Number(r.totalExpense) || 0), 0);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const viewIds = eligibleInView.map((r) => r._id);
    if (allEligibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !viewIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...viewIds])]);
  };

  const exportToExcel = () => {
    if (!filteredRequests.length) {
      setMessage("❌ No travel requests to export");
      return;
    }

    const sheetData = filteredRequests.map((r, idx) => ({
      "Sr. No": idx + 1,
      "Emp Code": r.empCode || "-",
      "Emp Name": r.empName || "-",
      Branch: r.branch || "-",
      Region: r.region || "-",
      "Manager Code": r.managerCode || "-",
      "Manager Name": r.managerName || "-",
      "To Location": r.toLocation || "-",
      Purpose: r.purpose || "-",
      "Request Date": fmtDate(r.requestDate || r.createdAt),
      Status: r.reimbursed ? "Reimbursed" : r.status || "-",
      "Approved By": r.approvedBy || "-",
      "Approved Date": fmtDate(r.approvedDate),
      "Rejected By": r.rejectedBy || "-",
      "Reject Reason": r.rejectReason || "-",
      "Travel Expense (₹)": r.travelExpense || 0,
      "Food Expense (₹)": r.foodExpense || 0,
      "Accommodation Expense (₹)": r.accommodationExpense || 0,
      "Total Expense (₹)": r.totalExpense || 0,
      "Expense Verified": r.expenseVerified ? "Yes" : "No",
      "Verified By": r.verifiedBy || "-",
      "Verified Date": fmtDate(r.verifiedDate),
      Reimbursed: r.reimbursed ? "Yes" : "No",
      "Reimbursed By": r.reimbursedBy || "-",
      "Reimbursed Date": fmtDate(r.reimbursedDate),
      Bills: r.billsUrl ? `${API_BASE}${r.billsUrl}` : "-",
      Tickets: r.ticketsUrl ? `${API_BASE}${r.ticketsUrl}` : "-",
      Invoices: r.invoicesUrl ? `${API_BASE}${r.invoicesUrl}` : "-",
      "Customer IDs": (r.visitedCustomerIds || []).join(", ") || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Travel Requests");

    const filterLabel = filter === "all" ? "All" : filter;
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Admin_Travel_Requests_${filterLabel}_${dateStr}.xlsx`);
  };

  const getStatusBadge = (status, reimbursed) => {
    // ✅ Show reimbursed badge if reimbursed
    if (reimbursed) {
      return (
        <span style={{
          padding: "4px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          background: "#f0fdf4",
          color: "#15803d",
        }}>
          💰 Reimbursed
        </span>
      );
    }

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
    <div style={{ padding: "12px 16px", paddingBottom: selectedRecords.length > 0 ? 88 : 16 }}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          ✈️ Travel Requests
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && (
            <button onClick={exportToExcel} style={exportBtn}>
              📥 Export to Excel
            </button>
          )}
          <button onClick={() => loadRequests()} style={refreshBtn}>
            🔄 Refresh
          </button>
        </div>
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
        <div
          style={{ ...statCardSmall("#dbeafe", "#2563eb"), cursor: "pointer" }}
          onClick={() => setFilter("completed")}
        >
          <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.completed}</span>
          <span style={{ fontSize: 11 }}>Completed</span>
        </div>
        {isAdmin && (
          <div
            style={{ ...statCardSmall("#f0fdf4", "#15803d"), cursor: "pointer" }}
            onClick={() => setFilter("reimburse")}
          >
            <span style={{ fontSize: 20, fontWeight: 700 }}>{stats.toReimburse}</span>
            <span style={{ fontSize: 11 }}>To Reimburse</span>
          </div>
        )}
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
          ...(isAdmin
            ? [
                { key: "reimburse", label: "💰 To Reimburse" },
                { key: "reimbursed", label: "Reimbursed" },
              ]
            : []),
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

      {isAdmin && (
        <div style={bulkBar}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={allEligibleSelected}
              onChange={toggleSelectAll}
              disabled={!eligibleInView.length}
            />
            Select all pending reimbursement in this view ({eligibleInView.length})
          </label>
          <div style={{ fontSize: 13, color: "#334155" }}>
            Selected: <strong>{selectedRecords.length}</strong> • Amount: <strong>₹{selectedTotal}</strong>
          </div>
          <button
            onClick={() => setBulkConfirm(true)}
            disabled={!selectedRecords.length || bulkLoading}
            style={{
              ...reimburseBtn,
              opacity: !selectedRecords.length || bulkLoading ? 0.6 : 1,
              cursor: !selectedRecords.length || bulkLoading ? "not-allowed" : "pointer",
            }}
          >
            💰 Mark as Reimbursed
          </button>
        </div>
      )}

      {message && (
        <div style={{
          padding: "10px 16px",
          marginBottom: 16,
          borderRadius: 8,
          background: message.includes("✅") ? "#dcfce7" : message.includes("⚠️") ? "#fef3c7" : "#fee2e2",
          color: message.includes("✅") ? "#166534" : message.includes("⚠️") ? "#92400e" : "#dc2626",
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
            <div key={req._id} style={{
              ...requestCard,
              border: selectedIds.includes(req._id) ? "1px solid #15803d" : "1px solid #e5e7eb",
            }}>
              {/* Header - Employee Info + Status */}
              <div style={cardHeader}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    flex: 1,
                    cursor: isAdmin && isEligibleForReimburse(req) ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (isAdmin && isEligibleForReimburse(req)) toggleSelect(req._id);
                  }}
                >
                  {isAdmin && isEligibleForReimburse(req) && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req._id)}
                      onChange={() => toggleSelect(req._id)}
                      onClick={(e) => e.stopPropagation()}
                      style={selectCheckbox}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{req.empName}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{req.empCode} • {req.branch || "-"}</div>
                  </div>
                </div>
                {getStatusBadge(req.status, req.reimbursed)}
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
                  Tour Date: {req.requestDate ? new Date(req.requestDate).toLocaleDateString() : "-"}
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
              {req.visitedCustomerIds?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#334155" }}>
                  🏷️ Customer IDs: {req.visitedCustomerIds.join(", ")}
                </div>
              )}

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

              {/* Reimbursed Info */}
              {req.reimbursed && (
                <div style={{ padding: "8px 12px", background: "#f0fdf4", borderRadius: 6, fontSize: 12, color: "#15803d", marginTop: 8 }}>
                  💰 Reimbursed by: {req.reimbursedBy} on {new Date(req.reimbursedDate).toLocaleDateString()}
                </div>
              )}

              {/* ✅ Admin: Mark as Reimbursed (only for Completed tours) */}
              {isAdmin && req.status === "Completed" && !req.reimbursed && (
                <div style={cardActions}>
                  <button onClick={() => handleMarkReimbursed(req._id)} style={reimburseBtn}>
                    💰 Mark as Reimbursed
                  </button>
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

      {isAdmin && selectedRecords.length > 0 && (
        <div style={stickyBulkBar}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {selectedRecords.length} selected
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Total ₹{selectedTotal}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setSelectedIds([])}
              disabled={bulkLoading}
              style={{ ...cancelBtn, background: "#fff" }}
            >
              Clear
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={bulkLoading}
              style={reimburseBtn}
            >
              💰 Mark Selected as Reimbursed
            </button>
          </div>
        </div>
      )}

      {bulkConfirm && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: "0 0 16px", color: "#15803d" }}>💰 Confirm Bulk Reimbursement</h3>
            <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 12 }}>
              Mark <strong>{selectedRecords.length}</strong> completed tour
              {selectedRecords.length === 1 ? "" : "s"} as reimbursed for a total of{" "}
              <strong>₹{selectedTotal}</strong>? Amounts will be taken from the database, not the selected totals shown here.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={handleBulkReimburse} disabled={bulkLoading} style={reimburseBtn}>
                {bulkLoading ? "Processing..." : "Confirm Reimburse"}
              </button>
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={bulkLoading}
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

const bulkBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
  padding: "10px 14px",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: 8,
};

const selectCheckbox = {
  width: 20,
  height: 20,
  marginTop: 2,
  accentColor: "#15803d",
  cursor: "pointer",
};

const stickyBulkBar = {
  position: "fixed",
  left: 12,
  right: 12,
  bottom: 12,
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  padding: "12px 16px",
  background: "#14532d",
  color: "#fff",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(20, 83, 45, 0.35)",
};

const exportBtn = {
  padding: "8px 14px",
  background: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
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

const reimburseBtn = {
  padding: "6px 12px",
  background: "#15803d",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
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

