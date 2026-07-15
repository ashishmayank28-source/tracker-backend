import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AdminRevenueTracker() {
  const { token, user } = useAuth();
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branch, setBranch] = useState("");
  const [region, setRegion] = useState("");
  const [empName, setEmpName] = useState("");

  /* 🔹 SUM of filtered data */
  const totalOrderValue = revenue.reduce(
    (sum, r) => sum + (Number(r.orderValue) || 0),
    0
  );

  /* 🔹 Fetch Admin Revenue */
  async function loadRevenue() {
    if (!token) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/api/revenue/admin`;
      const params = [];
      if (from && to) params.push(`from=${from}&to=${to}`);
      if (branch) params.push(`branch=${branch}`);
      if (region) params.push(`region=${region}`);
      if (empName) params.push(`empName=${empName}`);
      if (params.length) url += "?" + params.join("&");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRevenue(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Admin Revenue fetch error:", err);
      setRevenue([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadRevenue();
  }, [token]);

  /* 🔹 Admin Accept Entry */
  async function acceptEntry(id) {
    if (!window.confirm("Accept this revenue entry?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/revenue/admin/accept/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevenue((prev) =>
          prev.map((r) =>
            r._id === id
              ? { ...r, adminApproved: true, adminApprovedBy: data.adminApprovedBy }
              : r
          )
        );
        alert("✅ Entry accepted successfully");
      } else alert(data.message || "Failed to accept");
    } catch (err) {
      console.error(err);
      alert("Error accepting entry");
    }
  }

  /* 🔹 Admin Reject Entry (Permanent Delete) */
  async function rejectEntry(id) {
    if (!window.confirm("Reject and permanently delete this entry? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/revenue/admin/reject/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevenue((prev) => prev.filter((r) => r._id !== id));
        alert("❌ Entry permanently removed");
      } else alert(data.message || "Failed to reject");
    } catch (err) {
      console.error(err);
      alert("Error rejecting entry");
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
      "Emp Name": r.empName,
      "Total Value (₹)": r.orderValue,
      Item: r.itemName,
      "PO No": r.poNumber,
      Date: new Date(r.date).toLocaleDateString(),
      Branch: r.branch || "-",
      Region: r.region || "-",
      "Approved By": r.approvedBy || "-",
      "Submitted By": r.submittedBy || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admin Revenue");
    XLSX.writeFile(wb, `Admin_Revenue_${new Date().toLocaleDateString()}.xlsx`);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        💰 Admin Revenue Tracker
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
        <span>💰 Total Revenue: ₹{totalOrderValue.toLocaleString("en-IN")}</span>
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
              <th style={th}>Emp Name</th>
              <th style={th}>Total Value (₹)</th>
              <th style={th}>Item</th>
              <th style={th}>PO No.</th>
              <th style={th}>Uploaded PO</th>
              <th style={th}>Date</th>
              <th style={thBlue}>Reported by</th>
              <th style={thYellow}>Approved by BM</th>
              <th style={thGreen}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="19" style={{ textAlign: "center", padding: 20 }}>
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
                  <td style={td}>{r.empName || "-"}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#16a34a" }}>₹{r.orderValue || "-"}</td>
                  <td style={td}>{r.itemName || "-"}</td>
                  <td style={td}>{r.poNumber || "-"}</td>
                  <td style={td}>
                    {r.poFileUrl && r.poFileUrl !== "-" && r.poFileUrl.trim() !== "" ? (
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
                  <td style={tdGreen}>
                    {r.adminApproved ? (
                      <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 11 }}>✅ Accepted</span>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => acceptEntry(r._id)} style={btnAccept}>✓ Accept</button>
                        <button onClick={() => rejectEntry(r._id)} style={btnReject}>✗ Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="19" style={{ textAlign: "center", padding: 20 }}>
                  No submitted revenue found. (Only BM-submitted entries appear here - no duplicates)
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
              <iframe src={selectedPO} width="100%" height="600px" style={{ border: "1px solid #ccc", borderRadius: 8 }} title="PO Preview" />
            ) : (
              <img src={selectedPO} alt="PO File" style={{ width: "100%", maxWidth: 900, borderRadius: 8 }} />
            )}
          </div>
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
const thGreen = { ...th, background: "#dcfce7" };
const td = { padding: "8px 10px", fontSize: "11px", whiteSpace: "nowrap" };
const tdGreen = { ...td, background: "#dcfce7" };
const btnAccept = { background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontSize: 10 };
const btnReject = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontSize: 10 };
const tdBlue = { ...td, background: "#dbeafe" };
const tdYellow = { ...td, background: "#fef3c7" };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 };
const btnBlue = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 };
const viewBtn = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 10 };
const filterRow = { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" };
const summaryBox = { marginBottom: 15, padding: "12px 20px", background: "#d1fae5", borderRadius: 8, fontWeight: "bold", fontSize: 14, display: "flex", gap: 20, flexWrap: "wrap" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const popup = { background: "#fff", borderRadius: 10, padding: 16, maxWidth: "90%", maxHeight: "90vh", overflow: "auto", position: "relative" };
const closeBtn = { position: "absolute", top: 10, right: 10, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: "bold" };
