import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function TourApprovalForm({ token, user }) {
  const [activeView, setActiveView] = useState("request"); // request | history | expenses
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Request Form State
  const [toLocation, setToLocation] = useState("");
  const [purpose, setPurpose] = useState("");

  // Expense Form State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [travelExpense, setTravelExpense] = useState("");
  const [foodExpense, setFoodExpense] = useState("");
  const [accommodationExpense, setAccommodationExpense] = useState("");
  const [expenseRemarks, setExpenseRemarks] = useState("");

  // Load my tour requests
  useEffect(() => {
    loadMyRequests();
  }, [token]);

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tour/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Submit tour request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!toLocation || !purpose) {
      setMessage("❌ Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tour/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toLocation, purpose }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Tour request submitted successfully!");
        setToLocation("");
        setPurpose("");
        loadMyRequests();
        setTimeout(() => setActiveView("history"), 1500);
      } else {
        setMessage(`❌ ${data.message || "Failed to submit request"}`);
      }
    } catch (err) {
      setMessage("❌ Error submitting request");
    } finally {
      setLoading(false);
    }
  };

  // Submit expenses
  const handleSubmitExpenses = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tour/expenses/${selectedRequest._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          travelExpense: Number(travelExpense) || 0,
          foodExpense: Number(foodExpense) || 0,
          accommodationExpense: Number(accommodationExpense) || 0,
          remarks: expenseRemarks,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Expenses submitted successfully!");
        setSelectedRequest(null);
        setTravelExpense("");
        setFoodExpense("");
        setAccommodationExpense("");
        setExpenseRemarks("");
        loadMyRequests();
        setActiveView("history");
      } else {
        setMessage(`❌ ${data.message || "Failed to submit expenses"}`);
      }
    } catch (err) {
      setMessage("❌ Error submitting expenses");
    } finally {
      setLoading(false);
    }
  };

  // Open expense form for a request
  const openExpenseForm = (request) => {
    setSelectedRequest(request);
    setActiveView("expenses");
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: { bg: "#fef3c7", color: "#d97706" },
      Approved: { bg: "#dcfce7", color: "#16a34a" },
      Rejected: { bg: "#fee2e2", color: "#dc2626" },
      Completed: { bg: "#dbeafe", color: "#2563eb" },
    };
    const s = styles[status] || { bg: "#f3f4f6", color: "#6b7280" };
    return (
      <span style={{
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setActiveView("request")}
          style={tabStyle(activeView === "request")}
        >
          ✈️ New Request
        </button>
        <button
          onClick={() => setActiveView("history")}
          style={tabStyle(activeView === "history")}
        >
          📋 My Requests ({myRequests.length})
        </button>
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

      {/* Request Form */}
      {activeView === "request" && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h3 style={{ margin: 0 }}>✈️ Tour Approval Request</h3>
          </div>
          
          <div style={bodyStyle}>
            {/* Permission Text */}
            <div style={permissionBox}>
              <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>
                <strong>Dear Manager,</strong>
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#4b5563" }}>
                I hereby request your approval for an official tour/visit for business purposes. 
                Kindly review and approve my request at the earliest convenience.
              </p>
            </div>

            <form onSubmit={handleSubmitRequest}>
              <div style={formGroup}>
                <label style={labelStyle}>📍 To Location *</label>
                <input
                  type="text"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  placeholder="Enter destination city/place"
                  style={inputStyle}
                  required
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>📝 Purpose of Visit *</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe the purpose of your tour (client meeting, site visit, etc.)"
                  style={textareaStyle}
                  rows={3}
                  required
                />
              </div>

              <button type="submit" disabled={loading} style={submitBtnStyle}>
                {loading ? "⏳ Submitting..." : "📤 Send Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Request History */}
      {activeView === "history" && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h3 style={{ margin: 0 }}>📋 My Tour Requests</h3>
            <button onClick={loadMyRequests} style={refreshBtn}>🔄 Refresh</button>
          </div>

          <div style={bodyStyle}>
            {loading && <p>Loading...</p>}
            {!loading && myRequests.length === 0 && (
              <p style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>
                No tour requests yet. Create your first request!
              </p>
            )}

            {!loading && myRequests.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myRequests.map((req) => (
                  <div key={req._id} style={requestCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 16, fontWeight: 600 }}>📍 {req.toLocation}</span>
                          {getStatusBadge(req.status)}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                          {req.purpose}
                        </p>
                        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                          Requested: {new Date(req.requestDate).toLocaleDateString()}
                          {req.approvedBy && ` • Approved by: ${req.approvedBy}`}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: "flex", gap: 8 }}>
                        {req.status === "Approved" && !req.expensesFilled && (
                          <button
                            onClick={() => openExpenseForm(req)}
                            style={expenseBtnStyle}
                          >
                            💰 Fill Expenses
                          </button>
                        )}
                        {req.status === "Rejected" && req.rejectReason && (
                          <span style={{ fontSize: 12, color: "#dc2626" }}>
                            Reason: {req.rejectReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expenses Summary (if filled) */}
                    {req.expensesFilled && (
                      <div style={expenseSummary}>
                        <span>🚗 Travel: ₹{req.travelExpense}</span>
                        <span>🍽️ Food: ₹{req.foodExpense}</span>
                        <span>🏨 Stay: ₹{req.accommodationExpense}</span>
                        <span style={{ fontWeight: 600 }}>📊 Total: ₹{req.totalExpense}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Form */}
      {activeView === "expenses" && selectedRequest && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h3 style={{ margin: 0 }}>💰 Tour Expense Report</h3>
            <button onClick={() => setActiveView("history")} style={refreshBtn}>← Back</button>
          </div>

          <div style={bodyStyle}>
            <div style={permissionBox}>
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>Tour to: {selectedRequest.toLocation}</strong>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                Purpose: {selectedRequest.purpose}
              </p>
            </div>

            <form onSubmit={handleSubmitExpenses}>
              <div style={formGroup}>
                <label style={labelStyle}>🚗 Travel Expense (From-To) (₹)</label>
                <input
                  type="number"
                  value={travelExpense}
                  onChange={(e) => setTravelExpense(e.target.value)}
                  placeholder="Enter travel expense amount"
                  style={inputStyle}
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>🍽️ Food Expense (₹)</label>
                <input
                  type="number"
                  value={foodExpense}
                  onChange={(e) => setFoodExpense(e.target.value)}
                  placeholder="Enter food expense amount"
                  style={inputStyle}
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>🏨 Accommodation Expense (₹)</label>
                <input
                  type="number"
                  value={accommodationExpense}
                  onChange={(e) => setAccommodationExpense(e.target.value)}
                  placeholder="Enter accommodation expense amount"
                  style={inputStyle}
                />
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>📝 Remarks (Optional)</label>
                <textarea
                  value={expenseRemarks}
                  onChange={(e) => setExpenseRemarks(e.target.value)}
                  placeholder="Any additional notes about the expenses"
                  style={textareaStyle}
                  rows={2}
                />
              </div>

              {/* Total Display */}
              <div style={totalBox}>
                <span>Total Expense:</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>
                  ₹{(Number(travelExpense) || 0) + (Number(foodExpense) || 0) + (Number(accommodationExpense) || 0)}
                </span>
              </div>

              <button type="submit" disabled={loading} style={submitBtnStyle}>
                {loading ? "⏳ Submitting..." : "✅ Submit Expenses"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const tabStyle = (active) => ({
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: active ? "#2563eb" : "#f3f4f6",
  color: active ? "#fff" : "#374151",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s",
});

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 20px",
  background: "linear-gradient(135deg, #2563eb, #3b82f6)",
  color: "#fff",
};

const bodyStyle = {
  padding: 20,
};

const permissionBox = {
  padding: 16,
  background: "#f0f9ff",
  borderRadius: 8,
  border: "1px solid #bae6fd",
  marginBottom: 20,
};

const formGroup = {
  marginBottom: 16,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontWeight: 500,
  fontSize: 14,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  transition: "border 0.2s",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical",
};

const submitBtnStyle = {
  width: "100%",
  padding: "12px 20px",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s",
};

const refreshBtn = {
  padding: "6px 12px",
  background: "rgba(255,255,255,0.2)",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const requestCard = {
  padding: 16,
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#fafafa",
};

const expenseBtnStyle = {
  padding: "6px 14px",
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

const expenseSummary = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px dashed #d1d5db",
  display: "flex",
  gap: 16,
  fontSize: 13,
  color: "#4b5563",
};

const totalBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 16,
  background: "#f0f9ff",
  borderRadius: 8,
  marginBottom: 16,
  fontSize: 16,
};

