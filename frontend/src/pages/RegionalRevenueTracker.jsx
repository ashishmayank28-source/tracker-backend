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
      if (from && to) params.push(`from=${from}&to=${to}`);
      if (branch) params.push(`branch=${branch}`);
      if (empName) params.push(`empName=${empName}`);
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

  /* 🔹 Export to Excel */
  function exportToExcel() {
    const sheetData = revenue.map((r) => ({
      "Customer ID": r.customerId,
      "Customer Mob No.": r.customerMobile,
      "Customer Name": r.customerName,
      "Customer Type": r.customerType,
      Vertical: r.verticalType || r.vertical,
      "Distributor Code": r.distributorCode,
      "Distributor Name": r.distributorName,
      "Emp Code": r.empCode,
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
        <input type="text" placeholder="Filter by Employee..." value={empName} onChange={(e) => setEmpName(e.target.value)} style={inputStyle} />
        <button onClick={loadRevenue} style={btnBlue}>🔍 Filter</button>
        <button onClick={loadRevenue} style={{ ...btnBlue, background: "#3b82f6" }}>🔄 Refresh</button>
        <button onClick={() => { setFrom(""); setTo(""); setBranch(""); setEmpName(""); loadRevenue(); }} style={{ ...btnBlue, background: "#6b7280" }}>Clear</button>
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
              <th style={th}>Customer Name</th>
              <th style={th}>Customer Type</th>
              <th style={th}>Vertical</th>
              <th style={th}>Distributor Code</th>
              <th style={th}>Distributor Name</th>
              <th style={th}>Emp Code</th>
              <th style={th}>Emp Name</th>
              <th style={th}>Total Value (₹)</th>
              <th style={th}>Item</th>
              <th style={th}>PO No.</th>
              <th style={th}>Uploaded PO</th>
              <th style={th}>Date</th>
              <th style={thYellow}>Approved By</th>
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
                  <td style={td}>{r.customerId || "-"}</td>
                  <td style={td}>{r.customerMobile || "-"}</td>
                  <td style={td}>{r.customerName || "-"}</td>
                  <td style={td}>{r.customerType || "-"}</td>
                  <td style={td}>{r.verticalType || r.vertical || "-"}</td>
                  <td style={td}>{r.distributorCode || "-"}</td>
                  <td style={td}>{r.distributorName || "-"}</td>
                  <td style={td}>{r.empCode || "-"}</td>
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
                  <td style={tdYellow}>{r.approvedBy || "-"}</td>
                  <td style={td}>{r.submittedBy || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="16" style={{ textAlign: "center", padding: 20 }}>
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
const thYellow = { ...th, background: "#fef3c7" };
const td = { padding: "8px 10px", fontSize: "11px", whiteSpace: "nowrap" };
const tdYellow = { ...td, background: "#fef3c7" };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 };
const btnBlue = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 };
const viewBtn = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 10 };
const filterRow = { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" };
const summaryBox = { marginBottom: 15, padding: "12px 20px", background: "#d1fae5", borderRadius: 8, fontWeight: "bold", fontSize: 14, display: "flex", gap: 20, flexWrap: "wrap" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const popup = { background: "#fff", padding: 16, borderRadius: 10, maxWidth: "90%", maxHeight: "90vh", overflow: "auto", position: "relative" };
const closeBtn = { position: "absolute", top: 10, right: 10, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: "bold" };
