import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RevenueTrackerBranch() {
  const { token, user } = useAuth();
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [team, setTeam] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* 🔹 Fetch Branch Team (direct reportees) */
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`${API_BASE}/api/users/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTeam(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Team fetch error:", e);
        setTeam([]);
      }
    }
    if (user?.empCode) fetchTeam();
  }, [token, user]);

  /* 🔹 Fetch BM Revenue (manager submitted + direct reportees) */
  async function loadRevenue() {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/revenue/bm`;
      const params = [];
      if (selectedEmp !== "all") params.push(`empCode=${selectedEmp}`);
      if (from && to) params.push(`from=${from}&to=${to}`);
      if (params.length) url += "?" + params.join("&");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRevenue(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Revenue fetch error:", e);
      setRevenue([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRevenue();
  }, [selectedEmp]);

  /* 🔹 Approve Revenue (for direct reportees) */
  async function approveRevenue(id) {
    try {
      const res = await fetch(`${API_BASE}/api/revenue/approve/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevenue((prev) =>
          prev.map((r) =>
            r._id === id ? { ...r, approved: true, approvedBy: user.name } : r
          )
        );
        alert("✅ Revenue approved successfully");
      } else alert(data.message || "Failed to approve");
    } catch (e) {
      console.error(e);
      alert("Error approving revenue");
    }
  }

  /* 🔹 Add Manual Row */
  function addManualRow() {
    const manualId = `MANUAL-${Date.now()}`;
    setRevenue((prev) => [
      ...prev,
      {
        _id: manualId,
        customerId: manualId,
        customerMobile: "",
        empCode: "",
        empName: "",
        branch: user.branch || "",
        region: user.region || "",
        customerName: "",
        customerType: "",
        vertical: "",
        distributorCode: "",
        distributorName: "",
        orderType: "Project",
        itemName: "",
        orderValue: "",
        poNumber: "",
        poFileUrl: "-",
        managerCode: user.empCode,
        managerName: user.name,
        reportedBy: "BM",
        isManual: true,
        saved: false,
        date: new Date(),
      },
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
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
  }

  /* 🔹 Save Manual Sale */
  async function saveManualSale(row) {
    try {
      if (!row.empCode) {
        alert("⚠️ Please select an employee before saving.");
        return;
      }

      const payload = {
        customerId: row.customerId,
        customerMobile: row.customerMobile || "NA",
        empCode: row.empCode,
        empName: row.empName,
        branch: row.branch,
        region: row.region,
        orderType: row.orderType,
        orderValue: row.orderValue,
        itemName: row.itemName,
        poNumber: row.poNumber,
        poFileUrl: row.poFileUrl,
        customerName: row.customerName || "Manual Entry",
        customerType: row.customerType || "Manual",
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

      if (res.ok && data?.success) {
        alert("✅ Manual Sale Saved Successfully");
        await loadRevenue();
      } else {
        alert(data.message || "❌ Failed to save manual sale");
      }
    } catch (err) {
      console.error("Manual save error:", err);
      alert("⚠️ Error saving manual entry");
    }
  }

  /* 🔹 Submit ALL approved entries to RM/Admin */
  async function submitToRMAdmin() {
    try {
      const approvedReports = revenue.filter((r) => r.approved || r.approvedBy);
      if (approvedReports.length === 0) {
        return alert("⚠️ No approved entries to submit.");
      }
      const res = await fetch(`${API_BASE}/api/revenue/submit-bm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reports: approvedReports }),
      });
      const data = await res.json();
      alert(data.message || `✅ ${approvedReports.length} entries submitted to RM/Admin`);
      loadRevenue();
    } catch (err) {
      console.error("Submit Error:", err);
      alert("❌ Failed to submit entries");
    }
  }

  /* 🔹 Export to Excel */
  function exportToExcel() {
    const sheetData = revenue.map((r) => ({
      Date: new Date(r.date).toLocaleDateString(),
      "Customer ID": r.customerId,
      "Customer Mobile": r.customerMobile,
      Employee: `${r.empName} (${r.empCode})`,
      Branch: r.branch,
      Region: r.region,
      Customer: r.customerName,
      Type: r.customerType,
      Vertical: r.verticalType || r.vertical,
      "Distributor Code": r.distributorCode,
      "Distributor Name": r.distributorName,
      "Order Type": r.orderType,
      Item: r.itemName,
      "Order Value (₹)": r.orderValue,
      "PO No": r.poNumber,
      "Approved By": r.approvedBy || "-",
      "Submitted By": r.submittedBy || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Branch Revenue");
    XLSX.writeFile(wb, `Branch_Revenue_${new Date().toLocaleDateString()}.xlsx`);
  }

  /* 🔹 Calculate totals */
  const totalOrderValue = revenue.reduce(
    (sum, r) => sum + (Number(r.orderValue) || 0),
    0
  );
  const approvedCount = revenue.filter((r) => r.approved || r.approvedBy).length;
  const pendingCount = revenue.filter((r) => !r.approved && !r.approvedBy).length;

  if (loading) return <p>Loading revenue data...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        💰 Revenue Tracker (Branch Manager View)
      </h2>

      {/* Filters */}
      <div style={filterRow}>
        <select
          value={selectedEmp}
          onChange={(e) => setSelectedEmp(e.target.value)}
          style={inputStyle}
        >
          <option value="all">All Employees</option>
          {team.map((emp) => (
            <option key={emp.empCode} value={emp.empCode}>
              {emp.name} ({emp.empCode})
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        <button onClick={loadRevenue} style={btnBlueSmall}>🔍 Filter</button>
        <button onClick={loadRevenue} style={{ ...btnBlueSmall, background: "#3b82f6" }}>🔄 Refresh</button>
        <button onClick={exportToExcel} style={btnBlueSmall}>📤 Export Excel</button>
        <button onClick={addManualRow} style={btnGreenSmall}>➕ Add Manual Sale</button>
        <button onClick={submitToRMAdmin} style={{ ...btnBlueSmall, background: "#7c3aed" }}>
          🚀 Submit to RM/Admin ({approvedCount})
        </button>
      </div>

      {/* ✅ Summary */}
      <div style={summaryBox}>
        <span>💰 Total: ₹{totalOrderValue.toLocaleString("en-IN")}</span>
        <span>📊 Records: {revenue.length}</span>
        <span style={{ color: "#16a34a" }}>✅ Approved: {approvedCount}</span>
        <span style={{ color: "#f59e0b" }}>⏳ Pending: {pendingCount}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: "70vh", border: "1px solid #ccc", borderRadius: 6 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Employee</th>
              <th style={th}>Customer ID</th>
              <th style={th}>Customer Mobile</th>
              <th style={th}>Customer Name</th>
              <th style={th}>Customer Type</th>
              <th style={th}>Vertical</th>
              <th style={th}>Distributor Code</th>
              <th style={th}>Distributor Name</th>
              <th style={th}>Order Type</th>
              <th style={th}>Item</th>
              <th style={th}>Value (₹)</th>
              <th style={th}>PO No.</th>
              <th style={th}>Upload PO</th>
              <th style={th}>PO File</th>
              <th style={th}>Reported By</th>
              <th style={{ ...th, background: "#fef3c7" }}>Approved By</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {revenue.length > 0 ? (
              revenue.map((r) => (
                <tr key={r._id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={td}>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>

                  {/* Employee */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <select
                        value={r.empCode}
                        onChange={(e) => {
                          const emp = team.find((x) => x.empCode === e.target.value);
                          updateManualRow(r._id, "empCode", e.target.value);
                          updateManualRow(r._id, "empName", emp?.name || "-");
                          updateManualRow(r._id, "branch", emp?.branch || user.branch || "-");
                          updateManualRow(r._id, "region", emp?.region || user.region || "-");
                        }}
                        style={inputSmall}
                      >
                        <option value="">Select Employee</option>
                        {team.map((emp) => (
                          <option key={emp.empCode} value={emp.empCode}>
                            {emp.name} ({emp.empCode})
                          </option>
                        ))}
                      </select>
                    ) : (
                      `${r.empName || "-"} (${r.empCode || "-"})`
                    )}
                  </td>

                  <td style={td}>{r.customerId || "-"}</td>

                  {/* Customer Mobile */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <input type="text" value={r.customerMobile || ""} onChange={(e) => updateManualRow(r._id, "customerMobile", e.target.value)} style={inputSmall} />
                    ) : (r.customerMobile || "-")}
                  </td>

                  {/* Customer Name */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <input type="text" value={r.customerName || ""} onChange={(e) => updateManualRow(r._id, "customerName", e.target.value)} style={inputSmall} />
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
                    ) : (r.verticalType || r.vertical || "-")}
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

                  {/* Order Type */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <select value={r.orderType || "Project"} onChange={(e) => updateManualRow(r._id, "orderType", e.target.value)} style={inputSmall}>
                        <option value="Retail">Retail</option>
                        <option value="Project">Project</option>
                      </select>
                    ) : (r.orderType || "-")}
                  </td>

                  {/* Item */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <input type="text" value={r.itemName || ""} onChange={(e) => updateManualRow(r._id, "itemName", e.target.value)} style={inputSmall} />
                    ) : (r.itemName || "-")}
                  </td>

                  {/* Value */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <input type="number" value={r.orderValue || ""} onChange={(e) => updateManualRow(r._id, "orderValue", e.target.value)} style={inputSmall} />
                    ) : (r.orderValue || "-")}
                  </td>

                  {/* PO Number */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <input type="text" value={r.poNumber || ""} onChange={(e) => updateManualRow(r._id, "poNumber", e.target.value)} style={inputSmall} />
                    ) : (r.poNumber || "-")}
                  </td>

                  {/* Upload PO */}
                  <td style={td}>
                    {r.isManual && !r.saved && (
                      <input type="file" accept="image/*,.pdf" onChange={(e) => uploadPOFile(e, r._id)} style={{ width: "100px", fontSize: 11 }} />
                    )}
                  </td>

                  {/* PO File View */}
                  <td style={td}>
                    {r.poFileUrl && r.poFileUrl !== "-" && r.poFileUrl.trim() !== "" ? (
                      <button
                        onClick={() => {
                          const fileUrl = r.poFileUrl.startsWith("http") ? r.poFileUrl : `${API_BASE}${r.poFileUrl}`;
                          setSelectedPO(fileUrl);
                        }}
                        style={btnView}
                      >
                        🖼️ View
                      </button>
                    ) : "-"}
                  </td>

                  <td style={td}>{r.reportedBy || "Employee"}</td>

                  {/* Approved By */}
                  <td style={{ ...td, background: "#fef3c7" }}>
                    {r.approved || r.approvedBy ? (
                      <span style={{ color: "#16a34a", fontWeight: 600 }}>
                        ✅ {r.approvedBy || user.name}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>-</span>
                    )}
                  </td>

                  {/* Action */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <button onClick={() => saveManualSale(r)} style={btnSave}>
                        🟢 Save
                      </button>
                    ) : r.approved || r.approvedBy ? (
                      <span style={{ color: "green", fontWeight: 600 }}>✅ Approved</span>
                    ) : (
                      <button onClick={() => approveRevenue(r._id)} style={btnApprove}>
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="18" style={{ textAlign: "center", padding: 20 }}>
                  No revenue data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PO View Modal */}
      {selectedPO && (
        <div style={overlay} onClick={() => setSelectedPO(null)}>
          <div style={popup} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setSelectedPO(null)}>✕ Close</button>
            {selectedPO.toLowerCase().endsWith(".pdf") ? (
              <iframe src={selectedPO} width="100%" height="600px" style={{ border: "none" }} title="PO" />
            ) : (
              <img src={selectedPO} alt="PO" style={{ width: "100%", maxWidth: "900px", borderRadius: 8 }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const th = { padding: "10px", borderBottom: "2px solid #ccc", fontSize: "12px", fontWeight: 600, background: "#f4f4f4", position: "sticky", top: 0, zIndex: 10, whiteSpace: "nowrap" };
const td = { padding: "8px 10px", fontSize: "12px" };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" };
const inputSmall = { padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, width: "100px", fontSize: "11px" };
const btnBlueSmall = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: "13px" };
const btnGreenSmall = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: "13px" };
const btnView = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: "11px" };
const btnSave = { background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontWeight: 600, fontSize: "12px" };
const btnApprove = { background: "#facc15", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontWeight: 600, fontSize: "12px" };
const filterRow = { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" };
const summaryBox = { marginBottom: 15, padding: "12px 20px", background: "#d1fae5", borderRadius: 8, fontWeight: "bold", fontSize: 14, display: "flex", gap: 20, flexWrap: "wrap" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const popup = { background: "#fff", borderRadius: 10, padding: 16, maxWidth: "90%", maxHeight: "90vh", overflow: "auto", position: "relative" };
const closeBtn = { position: "absolute", top: 10, right: 10, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: "bold" };
