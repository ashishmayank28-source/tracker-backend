import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RevenueTrackerManager() {
  const { token, user } = useAuth();
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [team, setTeam] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* 🔹 Fetch Team */
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`${API_BASE}/api/users/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTeam(data);
      } catch (e) {
        console.error("Team fetch error:", e);
      }
    }
    fetchTeam();
  }, [token]);

  /* 🔹 Fetch Revenue */
  async function loadRevenue() {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/revenue/manager`;
      const params = [];
      if (selectedEmp !== "all") params.push(`empCode=${selectedEmp}`);
      if (from && to) params.push(`from=${from}&to=${to}`);
      if (params.length) url += "?" + params.join("&");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRevenue(data);
    } catch (e) {
      console.error("Revenue fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRevenue();
  }, [selectedEmp]);

  /* 🔹 Note: Approve function removed - Only BM can approve now */

  /* 🔹 Add Manual Row (+ Manual button) */
  function addManualRow() {
    setRevenue((prev) => [
      {
        _id: "temp-" + Date.now(),
        customerId: `MANUAL-${Date.now()}`,
        customerMobile: "",
        company: "",
        customerName: "",
        customerType: "",
        vertical: "",
        distributorCode: "",
        distributorName: "",
        empCode: "",
        empName: "",
        branch: "",
        region: "",
        orderValue: "",
        itemName: "",
        poNumber: "",
        poFileUrl: "-",
        date: new Date().toISOString(),
        managerName: user.name,
        managerCode: user.empCode,
        reportedBy: "Manager",
        approved: true,
        approvedBy: `${user.empCode} - ${user.name}`,
        isManual: true,
        saved: false,
      },
      ...prev,
    ]);
  }

  /* 🔹 Update Manual Row */
  function updateManualRow(id, field, value) {
    setRevenue((prev) =>
      prev.map((r) => (r._id === id ? { ...r, [field]: value } : r))
    );
  }

  /* 🔹 Upload PO File */
  async function uploadPOFile(e, rowId) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("poFile", file);

    try {
      const res = await fetch(`${API_BASE}/api/revenue/manager-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setRevenue((prev) =>
          prev.map((r) =>
            r._id === rowId ? { ...r, poFileUrl: data.fileUrl } : r
          )
        );
      } else alert("Upload failed");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading PO file");
    }
  }

  /* 🔹 Save Manual Sale (Report) */
  async function saveManualSale(row) {
    try {
      const payload = {
        empCode: row.empCode,
        branch: row.branch || "-",
        region: row.region || "-",
        orderType: row.orderType || "Project",
        orderValue: row.orderValue,
        itemName: row.itemName,
        poNumber: row.poNumber,
        poFileUrl: row.poFileUrl,
        customerMobile: row.customerMobile?.trim() || "NA",
        company: row.company?.trim() || "-",
        customerName: row.customerName?.trim() || "Manual Entry",
        customerType: row.customerType?.trim() || "Manual",
        vertical: row.vertical || "-",
        distributorCode: row.distributorCode || "-",
        distributorName: row.distributorName || "-",
      };

      const res = await fetch(`${API_BASE}/api/revenue/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        alert("🟢 Report submitted successfully!");
        loadRevenue();
      } else alert(data.message || "Failed to save manual sale");
    } catch (err) {
      console.error("Manual save error:", err);
      alert("Error saving manual sale");
    }
  }

  /* 🔹 Note: Submit to BM removed - Data now visible to all immediately */

  /* 🔹 Calculate Total Value */
  const totalOrderValue = revenue.reduce(
    (sum, r) => sum + (Number(r.orderValue) || 0),
    0
  );
  const approvedByBMCount = revenue.filter((r) => r.approvedByBM || r.approvedBy !== "-").length;
  const pendingBMCount = revenue.filter((r) => !r.approvedByBM && r.approvedBy === "-" && !r.rejected).length;

  /* 🔹 Export Excel */
  function exportToExcel() {
    const exportRows = revenue.map((r) => ({
      "Customer ID": r.customerId || "-",
      "Customer Mob No.": r.customerMobile || "-",
      "Company Name": r.company || "-",
      "Customer Name": r.customerName || "-",
      "Customer Type": r.customerType || "-",
      Vertical: r.verticalType || r.vertical || "-",
      "Sell Type": r.orderType || "-",
      "Distributor Code": r.distributorCode || "-",
      "Distributor Name": r.distributorName || "-",
      "Emp Code": r.empCode || "-",
      "Emp Name": r.empName || "-",
      "Total Value (₹)": r.orderValue || "-",
      Item: r.itemName || "-",
      "PO No": r.poNumber || "-",
      Date: r.date ? new Date(r.date).toLocaleDateString() : "-",
      "Reported By": r.reportedBy || "-",
      "Approved By": r.approvedByBM || r.approvedBy || "-",
      "Rejected By": r.rejectedBy || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Revenue");
    XLSX.writeFile(wb, `Manager_Revenue_${user.empCode}.xlsx`);
  }

  if (loading) return <p style={{ padding: 20 }}>⏳ Loading revenue data...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        💰 Revenue Tracker (Manager View)
      </h2>

      {/* Filters + Actions */}
      <div style={filterRow}>
        <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} style={inputStyle}>
          <option value="all">All Employees</option>
          {team.map((emp) => (
            <option key={emp.empCode} value={emp.empCode}>
              {emp.name} ({emp.empCode})
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        <button onClick={loadRevenue} style={btnBlue}>🔍 Filter</button>
        <button onClick={loadRevenue} style={{ ...btnBlue, background: "#3b82f6" }}>🔄 Refresh</button>
        <button onClick={exportToExcel} style={btnBlue}>📤 Export</button>
        <button onClick={addManualRow} style={btnGreen}>➕ Manual</button>
      </div>

      {/* ✅ Summary */}
      <div style={summaryBox}>
        <span>💰 Total: ₹{totalOrderValue.toLocaleString("en-IN")}</span>
        <span>📊 Records: {revenue.length}</span>
        <span style={{ color: "#16a34a" }}>✅ BM Approved: {approvedByBMCount}</span>
        <span style={{ color: "#f59e0b" }}>⏳ Pending BM: {pendingBMCount}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: "70vh", border: "1px solid #ccc", borderRadius: 6 }}>
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
              <th style={thRed}>Reject</th>
              <th style={th}>Status</th>
            </tr>
          </thead>

          <tbody>
            {revenue.map((r, i) => (
              <tr key={r._id || i} style={{ 
                borderBottom: "1px solid #ddd",
                background: r.rejected ? "#fee2e2" : r.approved ? "#f0fdf4" : "#fff"
              }}>
                <td style={td}>{r.customerId || "-"}</td>
                
                {/* Customer Mobile - Editable for Manual */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.customerMobile || ""} onChange={(e) => updateManualRow(r._id, "customerMobile", e.target.value)} style={inputSmall} placeholder="Mobile" />
                  ) : (r.customerMobile || "-")}
                </td>

                {/* Company Name */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.company || ""} onChange={(e) => updateManualRow(r._id, "company", e.target.value)} style={inputSmall} placeholder="Company" />
                  ) : (r.company || "-")}
                </td>

                {/* Customer Name */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.customerName || ""} onChange={(e) => updateManualRow(r._id, "customerName", e.target.value)} style={inputSmall} placeholder="Name" />
                  ) : (r.customerName || "-")}
                </td>

                {/* Customer Type */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <select value={r.customerType || ""} onChange={(e) => updateManualRow(r._id, "customerType", e.target.value)} style={inputSmall}>
                      <option value="">Select</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Contractor">Contractor</option>
                      <option value="End User">End User</option>
                    </select>
                  ) : (r.customerType || "-")}
                </td>

                {/* Vertical */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <select value={r.vertical || ""} onChange={(e) => updateManualRow(r._id, "vertical", e.target.value)} style={inputSmall}>
                      <option value="">Select</option>
                      <option value="EP">EP</option>
                      <option value="GFD">GFD</option>
                    </select>
                  ) : (r.vertical || r.verticalType || "-")}
                </td>

                {/* Sell Type */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <select value={r.orderType || "Project"} onChange={(e) => updateManualRow(r._id, "orderType", e.target.value)} style={inputSmall}>
                      <option value="Project">Project</option>
                      <option value="Retail">Retail</option>
                    </select>
                  ) : (r.orderType || "-")}
                </td>

                {/* Distributor Code */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.distributorCode || ""} onChange={(e) => updateManualRow(r._id, "distributorCode", e.target.value)} style={inputSmall} placeholder="Code" />
                  ) : (r.distributorCode || "-")}
                </td>

                {/* Distributor Name */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.distributorName || ""} onChange={(e) => updateManualRow(r._id, "distributorName", e.target.value)} style={inputSmall} placeholder="Name" />
                  ) : (r.distributorName || "-")}
                </td>

                {/* Emp Code */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <select
                      value={r.empCode || ""}
                      onChange={(e) => {
                        const emp = team.find((x) => x.empCode === e.target.value);
                        updateManualRow(r._id, "empCode", e.target.value);
                        updateManualRow(r._id, "empName", emp?.name || "-");
                        updateManualRow(r._id, "branch", emp?.branch || "-");
                        updateManualRow(r._id, "region", emp?.region || "-");
                      }}
                      style={inputSmall}
                    >
                      <option value="">Select</option>
                      {team.map((emp) => (
                        <option key={emp.empCode} value={emp.empCode}>{emp.empCode}</option>
                      ))}
                    </select>
                  ) : (r.empCode || "-")}
                </td>

                {/* Emp Name */}
                <td style={td}>{r.empName || "-"}</td>

                {/* Order Value */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="number" value={r.orderValue || ""} onChange={(e) => updateManualRow(r._id, "orderValue", e.target.value)} style={inputSmall} placeholder="Value" />
                  ) : (
                    <span style={{ fontWeight: 600, color: "#2563eb" }}>₹{r.orderValue || "-"}</span>
                  )}
                </td>

                {/* Item */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.itemName || ""} onChange={(e) => updateManualRow(r._id, "itemName", e.target.value)} style={inputSmall} placeholder="Item" />
                  ) : (r.itemName || "-")}
                </td>

                {/* PO No */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.poNumber || ""} onChange={(e) => updateManualRow(r._id, "poNumber", e.target.value)} style={inputSmall} placeholder="PO No" />
                  ) : (r.poNumber || "-")}
                </td>

                {/* Uploaded PO */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="file" accept="image/*,.pdf" onChange={(e) => uploadPOFile(e, r._id)} style={{ width: "100px", fontSize: 10 }} />
                  ) : r.poFileUrl && r.poFileUrl !== "-" ? (
                    <button onClick={() => setSelectedPO(r.poFileUrl.startsWith("http") ? r.poFileUrl : `${API_BASE}${r.poFileUrl}`)} style={viewBtn}>
                      🖼️ View
                    </button>
                  ) : "-"}
                </td>

                {/* Date */}
                <td style={td}>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>

                {/* ✅ Reported by Column */}
                <td style={tdBlue}>
                  <span style={{ color: "#1e40af", fontWeight: 600, fontSize: 11 }}>
                    {r.reportedBy || r.empCode || "-"}
                  </span>
                </td>

                {/* ✅ Approved by BM Column (Read-only for Manager) */}
                <td style={tdYellow}>
                  {r.approvedByBM || (r.approvedBy && r.approvedBy !== "-") ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✅ Approved</span>
                      <span style={{ color: "#166534", fontSize: 10 }}>by {r.approvedByBM || r.approvedBy}</span>
                    </div>
                  ) : (
                    <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 11 }}>⏳ Pending BM</span>
                  )}
                </td>

                {/* ✅ Reject Column */}
                <td style={tdRed}>
                  {r.rejected ? (
                    <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 11 }}>
                      ❌ {r.rejectedBy || "BM"}
                    </span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>-</span>
                  )}
                </td>

                {/* Action - Only Save for Manual entries (No Approve button - BM only) */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <button onClick={() => saveManualSale(r)} style={btnSave}>🟢 Save</button>
                  ) : r.rejected ? (
                    <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 11 }}>❌ Rejected</span>
                  ) : (r.approvedByBM || r.approvedBy !== "-") ? (
                    <span style={{ color: "green", fontWeight: 600, fontSize: 11 }}>✅ Approved</span>
                  ) : (
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>⏳ Awaiting BM</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PO Preview Modal */}
      {selectedPO && (
        <div style={overlay} onClick={() => setSelectedPO(null)}>
          <div style={popup} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setSelectedPO(null)}>✕</button>
            {selectedPO.endsWith(".pdf") ? (
              <iframe src={selectedPO} width="100%" height="600px" title="PO" />
            ) : (
              <img src={selectedPO} alt="PO" style={{ width: "100%", borderRadius: 8 }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 1600 };
const th = { padding: "10px", borderBottom: "2px solid #ccc", fontSize: "11px", fontWeight: 600, background: "#f4f4f4", position: "sticky", top: 0, zIndex: 10, whiteSpace: "nowrap" };
const thBlue = { ...th, background: "#dbeafe" };
const thYellow = { ...th, background: "#fef3c7" };
const thRed = { ...th, background: "#fee2e2" };
const td = { padding: "8px 10px", fontSize: "11px", whiteSpace: "nowrap" };
const tdBlue = { ...td, background: "#dbeafe" };
const tdYellow = { ...td, background: "#fef3c7" };
const tdRed = { ...td, background: "#fee2e2" };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 };
const inputSmall = { padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, width: "80px", fontSize: "10px" };
const btnBlue = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 };
const btnGreen = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 };
const btnSave = { background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontSize: 11 };
const viewBtn = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 10 };
const filterRow = { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" };
const summaryBox = { marginBottom: 15, padding: "12px 20px", background: "#d1fae5", borderRadius: 8, fontWeight: "bold", fontSize: 14, display: "flex", gap: 20, flexWrap: "wrap" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const popup = { background: "#fff", padding: 16, borderRadius: 10, maxWidth: "90%", maxHeight: "90vh", overflow: "auto", position: "relative" };
const closeBtn = { position: "absolute", top: 10, right: 10, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
