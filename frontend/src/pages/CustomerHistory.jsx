import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function CustomerHistory() {
  const { id: customerId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");
  const [showRevisitForm, setShowRevisitForm] = useState(false);

  // 🟢 Revisit form states
  const [discussion, setDiscussion] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [orderLossReason, setOrderLossReason] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");
  const [expectedOrderDate, setExpectedOrderDate] = useState("");
  const [vertical, setVertical] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [distributorCode, setDistributorCode] = useState("");
  const [orderType, setOrderType] = useState("");
  const [itemName, setItemName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poFileUrl, setPoFileUrl] = useState("");

  // 🟢 Load Customer History
  async function loadHistory() {
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load history");
      setHistory(data);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    if (customerId) loadHistory();
  }, [customerId, token]);

  // 🔙 Back Navigation
  const handleBack = () => {
    if (location.state?.from === "submitted") {
      navigate("/employee-dashboard", { state: { open: "submitted" } });
    } else {
      navigate(-1);
    }
  };

  // ✅ Revisit Submit
  async function handleRevisitSubmit(e) {
    e.preventDefault();

    const body = {
      empCode: user.empCode,
      discussion: discussion?.trim() || null,
      orderStatus: "Won",
      orderValue: Number(orderValue) || 0,
      orderLossReason: orderLossReason?.trim() || null,
      nextMeetingDate: nextMeetingDate || null,
      expectedOrderDate: expectedOrderDate || null,
      vertical: vertical?.trim() || null,
      distributorName: distributorName?.trim() || null,
      distributorCode: distributorCode?.trim() || null,
      orderType: orderType?.trim() || null,
      itemName: itemName?.trim() || null,
      poNumber: poNumber?.trim() || null,
      poFileUrl: poFileUrl?.trim() || null,
    };

    console.log("📤 Submitting Revisit Body:", body);

    try {
      const res = await fetch(`${API_BASE}/api/customers/revisit/${customerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save revisit");

      alert("✅ Revisit saved successfully!");
      setShowRevisitForm(false);
      await loadHistory(); // refresh
    } catch (err) {
      alert("❌ " + err.message);
    }
  }

  if (err) return <p style={{ color: "red" }}>{err}</p>;
  if (!history.length) return <p>No history found.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <button
        onClick={handleBack}
        style={{
          background: "#ccc",
          padding: "6px 12px",
          borderRadius: "6px",
          marginBottom: "10px",
          cursor: "pointer",
          border: "1px solid #999",
        }}
      >
        ← Back
      </button>

      <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
        📑 Customer History ({customerId})
      </h3>

      {/* 🟢 Revisit Form Toggle */}
      <button
        onClick={() => setShowRevisitForm(!showRevisitForm)}
        style={{
          background: "#2563eb",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        {showRevisitForm ? "Cancel Revisit" : "➕ Add Revisit"}
      </button>

      {showRevisitForm && (
        <form onSubmit={handleRevisitSubmit} style={formStyle}>
          <h4 style={{ marginBottom: "10px" }}>📝 Revisit Details</h4>

          <input placeholder="Discussion" value={discussion} onChange={(e) => setDiscussion(e.target.value)} style={input} />
          <input placeholder="Order Value" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} style={input} />
          <input placeholder="Loss Reason" value={orderLossReason} onChange={(e) => setOrderLossReason(e.target.value)} style={input} />
          <input placeholder="Vertical" value={vertical} onChange={(e) => setVertical(e.target.value)} style={input} />
          <input placeholder="Distributor Name" value={distributorName} onChange={(e) => setDistributorName(e.target.value)} style={input} />
          <input placeholder="Distributor Code" value={distributorCode} onChange={(e) => setDistributorCode(e.target.value)} style={input} />
          <input placeholder="Order Type" value={orderType} onChange={(e) => setOrderType(e.target.value)} style={input} />
          <input placeholder="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} style={input} />
          <input placeholder="PO Number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} style={input} />
          <input placeholder="PO File URL (if any)" value={poFileUrl} onChange={(e) => setPoFileUrl(e.target.value)} style={input} />

          <label>Next Meeting:</label>
          <input type="date" value={nextMeetingDate} onChange={(e) => setNextMeetingDate(e.target.value)} style={input} />

          <label>Expected Order:</label>
          <input type="date" value={expectedOrderDate} onChange={(e) => setExpectedOrderDate(e.target.value)} style={input} />

          <button type="submit" style={submitBtn}>
            ✅ Submit Revisit
          </button>
        </form>
      )}

      {/* History Table */}
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: "#f9f9f9" }}>
            <th style={th}>Customer ID</th>
            <th style={th}>Emp Code</th>
            <th style={th}>Name</th>
            <th style={th}>Mobile</th>
            <th style={th}>Company</th>
            <th style={th}>Meeting Type</th>
            <th style={th}>Discussion</th>
            <th style={th}>Order Status</th>
            <th style={th}>Order Value</th>
            <th style={th}>Vertical</th>
            <th style={th}>Distributor</th>
            <th style={th}>Order Type</th>
            <th style={th}>Item</th>
            <th style={th}>PO No</th>
            <th style={th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>{h.customerId}</td>
              <td style={td}>{h.empCode || "-"}</td>
              <td style={td}>{h.name}</td>
              <td style={td}>{h.mobile}</td>
              <td style={td}>{h.company || "-"}</td>
              <td style={td}>{h.meetingType}</td>
              <td style={td}>{h.discussion || "-"}</td>
              <td style={td}>{h.orderStatus || "-"}</td>
              <td style={td}>{h.orderValue || "-"}</td>
              <td style={td}>{h.vertical || "-"}</td>
              <td style={td}>{h.distributorName || "-"}</td>
              <td style={td}>{h.orderType || "-"}</td>
              <td style={td}>{h.itemName || "-"}</td>
              <td style={td}>{h.poNumber || "-"}</td>
              <td style={td}>{h.date ? new Date(h.date).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Styles ---------- */
const formStyle = {
  display: "grid",
  gap: "10px",
  background: "#f4f6fa",
  padding: "15px",
  borderRadius: "10px",
  marginBottom: "25px",
  border: "1px solid #ddd",
};

const input = {
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "13px",
};

const submitBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "600",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: "20px",
};

const th = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "1px solid #ddd",
  fontSize: "13px",
};

const td = {
  padding: "8px",
  fontSize: "13px",
};
