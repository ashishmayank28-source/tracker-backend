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

  /* 🔹 Export to Excel */
  function exportToExcel() {
    const sheetData = revenue.map((r) => ({
      Date: new Date(r.date).toLocaleDateString(),
      Branch: r.branch || "-",
      Region: r.region || "-",
      Employee: `${r.empName || "-"} (${r.empCode || "-"})`,
      "Customer ID": r.customerId,
      "Customer Name": r.customerName,
      "Customer Type": r.customerType,
      Vertical: r.verticalType || r.vertical,
      Distributor: r.distributorName,
      "Order Type": r.orderType,
      Item: r.itemName,
      "Order Value (₹)": r.orderValue,
      "PO No": r.poNumber,
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
      <h2 style={{ marginBottom: 15 }}>💰 Admin Revenue Tracker</h2>

      {/* 🔹 Filter Row */}
      <div style={filterRow}>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={inputStyle}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Filter by Branch..."
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Filter by Region..."
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Filter by Employee Name..."
          value={empName}
          onChange={(e) => setEmpName(e.target.value)}
          style={inputStyle}
        />
        <button onClick={loadRevenue} style={btnBlueSmall}>
          🔍 Filter
        </button>
        <button onClick={() => { setFrom(""); setTo(""); setBranch(""); setRegion(""); setEmpName(""); loadRevenue(); }} style={{ ...btnBlueSmall, background: "#6b7280" }}>
          Clear
        </button>
        <button onClick={exportToExcel} style={btnBlueSmall}>
          📤 Export Excel
        </button>
      </div>

      {/* 🔹 Summary */}
      <div style={{ marginBottom: 10, fontWeight: "bold", fontSize: 16 }}>
        Total Revenue (₹): {totalOrderValue.toLocaleString("en-IN")}
        {revenue.length ? ` | Records: ${revenue.length}` : ""}
      </div>

      {/* 🔹 Table */}
      <div style={{ overflowY: "auto", maxHeight: "75vh", border: "1px solid #ccc", borderRadius: 6 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Employee</th>
              <th style={th}>Branch</th>
              <th style={th}>Region</th>
              <th style={th}>Customer ID</th>
              <th style={th}>Customer</th>
              <th style={th}>Type</th>
              <th style={th}>Vertical</th>
              <th style={th}>Distributor</th>
              <th style={th}>Order Type</th>
              <th style={th}>Item</th>
              <th style={th}>Value (₹)</th>
              <th style={th}>PO No.</th>
              <th style={th}>PO File</th>
              <th style={th}>Approved By</th>
              <th style={th}>Submitted By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="16" style={{ textAlign: "center", padding: 20 }}>
                  ⏳ Loading data...
                </td>
              </tr>
            ) : revenue.length > 0 ? (
              revenue.map((r, i) => (
                <tr key={r._id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={td}>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                  <td style={td}>{r.empName || "-"} ({r.empCode || "-"})</td>
                  <td style={td}>{r.branch || "-"}</td>
                  <td style={td}>{r.region || "-"}</td>
                  <td style={td}>{r.customerId || "-"}</td>
                  <td style={td}>{r.customerName || "-"}</td>
                  <td style={td}>{r.customerType || "-"}</td>
                  <td style={td}>{r.verticalType || r.vertical || "-"}</td>
                  <td style={td}>{r.distributorName || "-"}</td>
                  <td style={td}>{r.orderType || "-"}</td>
                  <td style={td}>{r.itemName || "-"}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#16a34a" }}>{r.orderValue || "-"}</td>
                  <td style={td}>{r.poNumber || "-"}</td>
                  <td style={td}>
                    {r.poFileUrl && r.poFileUrl !== "-" && r.poFileUrl.trim() !== "" ? (
                      <button
                        onClick={() => {
                          const fileUrl = r.poFileUrl.startsWith("http")
                            ? r.poFileUrl
                            : `${API_BASE}${r.poFileUrl}`;
                          setSelectedPO(fileUrl);
                        }}
                        style={btnView}
                      >
                        🖼️ View
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={td}>{r.approvedBy || "-"}</td>
                  <td style={td}>{r.submittedBy || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="16" style={{ textAlign: "center", padding: 20 }}>
                  No submitted revenue found.
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
            <button style={closeBtn} onClick={() => setSelectedPO(null)}>
              ✕ Close
            </button>
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
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const th = {
  padding: "10px",
  borderBottom: "2px solid #ccc",
  fontSize: "13px",
  fontWeight: 600,
  background: "#f4f4f4",
  position: "sticky",
  top: 0,
  zIndex: 10,
};
const td = { padding: "8px 10px", fontSize: "13px" };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" };
const btnBlueSmall = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" };
const btnView = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" };
const filterRow = { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const popup = { background: "#fff", borderRadius: 10, padding: 16, maxWidth: "90%", maxHeight: "90vh", overflow: "auto", position: "relative" };
const closeBtn = { position: "absolute", top: 10, right: 10, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: "bold" };
