import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RegionalRevenueTracker() {
  const { token, user } = useAuth();
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branch, setBranch] = useState("");
  const [region, setRegion] = useState("");
  const [empName, setEmpName] = useState("");
  const [toast, setToast] = useState(null);

  /* 🔹 SUM of filtered data (Total Value) */
  const totalOrderValue = revenue.reduce(
    (sum, r) => sum + (Number(r.orderValue) || 0),
    0
  );

  /* 🔹 Fetch RM Revenue (BM submitted) */
  async function loadRevenue() {
    if (!token) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/api/revenue/rm`;
      const params = [];
      if (from) params.push(`from=${from}`);
      if (to) params.push(`to=${to}`);
      if (branch) params.push(`branch=${encodeURIComponent(branch)}`);
      if (region) params.push(`region=${encodeURIComponent(region)}`);
      if (empName) params.push(`empName=${encodeURIComponent(empName)}`);
      if (params.length) url += "?" + params.join("&");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        setRevenue(data);
        showToast(`✅ Data loaded successfully (${data.length} records)`, "success");
      } else {
        setRevenue([]);
        showToast("⚠️ Unexpected data format received.", "error");
      }
    } catch (err) {
      console.error("RM Revenue fetch error:", err);
      setRevenue([]);
      showToast("❌ Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  }

  /* 🔹 Toast helper */
  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (token && user?.empCode) {
      console.log("👀 Loading RM Revenue for:", user.empCode);
      loadRevenue();
    }
  }, [token, user]);

  async function approveRevenue(id) {
    try {
      const res = await fetch(`${API_BASE}/api/revenue/approve/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("✅ Revenue approved successfully", "success");
        loadRevenue();
      } else showToast(data.message || "Failed to approve", "error");
    } catch (e) {
      console.error(e);
      showToast("Error approving revenue", "error");
    }
  }

  async function rejectRevenue(id) {
    const reason = prompt("Enter reason for rejection:");
    if (!reason) return;
    try {
      const res = await fetch(`${API_BASE}/api/revenue/reject/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("❌ Entry rejected", "success");
        loadRevenue();
      } else showToast(data.message || "Failed to reject", "error");
    } catch (e) {
      console.error(e);
      showToast("Error rejecting entry", "error");
    }
  }

  /* 🔹 Export to Excel */
  function exportToExcel() {
    const sheetData = revenue.map((r) => ({
      "Customer ID": r.customerId,
      "Customer Mob No.": r.customerMobile,
      "Company Name": r.company || "-",
      "Customer Name": r.customerName,
      "Customer Type": r.customerType,
      Vertical: r.verticalType || r.vertical,
      "Sell Type": r.orderType || "-",
      "Distributor Code": r.distributorCode,
      "Distributor Name": r.distributorName,
      "Emp Code": r.empCode,
      Branch: r.branch || "-",
      Region: r.region || "-",
      "Emp Name": r.empName,
      "Total Value (₹)": r.orderValue,
      Item: r.itemName,
      "PO No": r.poNumber,
      Date: new Date(r.date).toLocaleDateString(),
      "Approved By": r.approvedBy || "-",
      "Submitted By": r.submittedBy || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Regional Revenue");
    XLSX.writeFile(
      wb,
      `Regional_Revenue_${new Date().toLocaleDateString()}.xlsx`
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        💰 Revenue Tracker (RM View)
      </h2>

      {/* 🔹 Filter Row */}
      <div style={filterRow}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        <input type="text" placeholder="Filter by Branch..." value={branch} onChange={(e) => setBranch(e.target.value)} style={inputStyle} />
        <input type="text" placeholder="Filter by Region..." value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle} />
        <input type="text" placeholder="Filter by Employee..." value={empName} onChange={(e) => setEmpName(e.target.value)} style={inputStyle} />
        <button onClick={loadRevenue} style={btnBlue}>🔍 Filter</button>
        <button onClick={loadRevenue} style={{ ...btnBlue, background: "#3b82f6" }}>🔄 Refresh</button>
        <button onClick={() => { setFrom(""); setTo(""); setBranch(""); setRegion(""); setEmpName(""); loadRevenue(); }} style={{ ...btnBlue, background: "#6b7280" }}>Clear</button>
        <button onClick={exportToExcel} style={btnBlue}>📤 Export</button>
      </div>

      {/* 🔹 Summary */}
      <div style={summaryBox}>
        <span>💰 Total: ₹{totalOrderValue.toLocaleString("en-IN")}</span>
        <span>📊 Records: {revenue.length}</span>
      </div>

      {/* 🔹 Table */}
      <div style={{ overflowX: "auto", maxHeight: "75vh", border: "1px solid #ccc", borderRadius: 6 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Customer ID</th>
              <th style={th}>Customer Mob No.</th>
              <th style={th}>Company Name</th>
              <th style={th}>Customer Name</th>
              <th style={th}>Customer Type</th>
              <th style={th}>Vertical</th>
              <th style={th}>Sell Type</th>
              <th style={th}>Distributor Code</th>
              <th style={th}>Distributor Name</th>
              <th style={th}>Emp Code</th>
              <th style={th}>Branch</th>
              <th style={th}>Region</th>
              <th style={th}>Emp Name</th>
              <th style={th}>Total Value (₹)</th>
              <th style={th}>Item</th>
              <th style={th}>PO No.</th>
              <th style={th}>Uploaded PO</th>
              <th style={th}>Date</th>
              <th style={thBlue}>Reported by</th>
              <th style={thYellow}>Approved by BM</th>
              <th style={thRed}>Reject</th>
              <th style={thGreen}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="22" style={{ textAlign: "center", padding: 20 }}>
                  ⏳ Loading data...
                </td>
              </tr>
            ) : revenue.length > 0 ? (
              revenue.map((r, i) => (
                <tr key={r._id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={td}>{r.customerId || "-"}</td>
                  <td style={td}>{r.customerMobile || "-"}</td>
                  <td style={td}>{r.company || "-"}</td>
                  <td style={td}>{r.customerName || "-"}</td>
                  <td style={td}>{r.customerType || "-"}</td>
                  <td style={td}>{r.verticalType || r.vertical || "-"}</td>
                  <td style={td}>{r.orderType || "-"}</td>
                  <td style={td}>{r.distributorCode || "-"}</td>
                  <td style={td}>{r.distributorName || "-"}</td>
                  <td style={td}>{r.empCode || "-"}</td>
                  <td style={td}>{r.branch || "-"}</td>
                  <td style={td}>{r.region || "-"}</td>
                  <td style={td}>{r.empName || "-"}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#16a34a" }}>₹{r.orderValue || "-"}</td>
                  <td style={td}>{r.itemName || "-"}</td>
                  <td style={td}>{r.poNumber || "-"}</td>
                  <td style={td}>
                    {r.poFileUrl && r.poFileUrl !== "-" ? (
                      <button
                        onClick={() => setSelectedPO(r.poFileUrl.startsWith("http") ? r.poFileUrl : `${API_BASE}${r.poFileUrl}`)}
                        style={viewBtn}
                      >
                        🖼️ View
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={td}>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                  
                  {/* ✅ Reported by Column */}
                  <td style={tdBlue}>
                    <span style={{ color: "#1e40af", fontWeight: 600, fontSize: 11 }}>
                      {r.reportedBy || r.empCode || "-"}
                    </span>
                  </td>
                  
                  <td style={tdYellow}>
                    {r.approvedByBM || (r.approvedBy && r.approvedBy !== "-") ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✅ Approved</span>
                        <span style={{ color: "#166534", fontSize: 10 }}>by {r.approvedByBM || r.approvedBy}</span>
                      </div>
                    ) : (
                      <span style={{ color: "#f59e0b", fontWeight: 600 }}>⏳ Pending BM</span>
                    )}
                  </td>
                  <td style={tdRed}>
                    {r.rejected ? (
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>❌ {r.rejectedBy || "-"}</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>-</span>
                    )}
                  </td>
                  <td style={tdGreen}>
                    {r.rejected ? (
                      <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 11 }}>❌ Rejected</span>
                    ) : r.canApprove ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => approveRevenue(r._id)} style={btnApprove}>✓ Approve</button>
                        <button onClick={() => rejectRevenue(r._id)} style={btnReject}>✗</button>
                      </div>
                    ) : (r.approvedByBM || (r.approvedBy && r.approvedBy !== "-")) ? (
                      <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 11 }}>✅ Approved</span>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: 11 }}>⏳ Pending</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="22" style={{ textAlign: "center", padding: 20 }}>
                  No submitted revenue found from BMs. (Only BM-submitted entries appear here)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔹 PO Preview Modal */}
      {selectedPO && (
        <div style={overlay} onClick={() => setSelectedPO(null)}>
          <div style={popup} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setSelectedPO(null)}>✕ Close</button>
            {selectedPO.toLowerCase().endsWith(".pdf") ? (
              <iframe src={selectedPO} width="100%" height="600px" style={{ border: "none" }} title="PO" />
            ) : (
              <img src={selectedPO} alt="PO File" style={{ width: "100%", maxWidth: 900, borderRadius: 8 }} />
            )}
          </div>
        </div>
      )}

      {/* 🔹 Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: toast.type === "success" ? "#16a34a" : toast.type === "error" ? "#dc2626" : "#2563eb",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          zIndex: 9999,
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 1500 };
const th = { padding: "10px", borderBottom: "2px solid #ccc", fontSize: "11px", fontWeight: 600, background: "#f4f4f4", position: "sticky", top: 0, zIndex: 10, whiteSpace: "nowrap" };
const thBlue = { ...th, background: "#dbeafe" };
const thYellow = { ...th, background: "#fef3c7" };
const thRed = { ...th, background: "#fee2e2" };
const thGreen = { ...th, background: "#dcfce7" };
const td = { padding: "8px 10px", fontSize: "11px", whiteSpace: "nowrap" };
const tdBlue = { ...td, background: "#dbeafe" };
const tdYellow = { ...td, background: "#fef3c7" };
const tdRed = { ...td, background: "#fee2e2" };
const tdGreen = { ...td, background: "#dcfce7" };
const btnApprove = { background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontSize: 10 };
const btnReject = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontSize: 10 };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 };
const btnBlue = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 };
const viewBtn = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 10 };
const filterRow = { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" };
const summaryBox = { marginBottom: 15, padding: "12px 20px", background: "#d1fae5", borderRadius: 8, fontWeight: "bold", fontSize: 14, display: "flex", gap: 20, flexWrap: "wrap" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const popup = { background: "#fff", padding: 16, borderRadius: 10, maxWidth: "90%", maxHeight: "90vh", overflow: "auto", position: "relative" };
const closeBtn = { position: "absolute", top: 10, right: 10, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: "bold" };
