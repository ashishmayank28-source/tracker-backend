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

  /* 🔹 Approve Revenue */
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
  setRevenue((prev) => [
    ...prev,
    {
      _id: "temp-" + Date.now(),
      empCode: "",
      empName: "",
      branch: "",
      region: "",
      managerName: user.name,
      managerCode: user.empCode,
      customerId: `MANUAL-${Date.now()}`,
      customerMobile: "",
      customerName: "",
      customerType: "",
      vertical: "",
      distributorCode: "",       // ✅ added
      distributorName: "",       // ✅ added
      orderType: "Project",
      orderValue: "",
      itemName: "",
      poNumber: "",
      poFileUrl: "-",
      date: new Date().toISOString(),
      reportedBy: "Manager",
      approved: true,
      approvedBy: user.name,
      isManual: true,
      saved: false,
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
  branch: row.branch || selectedEmp?.branch || "-",     
  region: row.region || selectedEmp?.region || "-",    
  orderType: row.orderType,
  orderValue: row.orderValue,
  itemName: row.itemName,
  poNumber: row.poNumber,
  poFileUrl: row.poFileUrl,
 customerMobile: row.customerMobile?.trim() || "NA", // ✅ default NA
  customerName: row.customerName?.trim() || "Manual Entry", // ✅ default name
  customerType: row.customerType?.trim() || "Manual", // ✅ default
  vertical: row.vertical || "-",  // ✅ corrected key
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

  /* 🔹 Submit All Approved Reports (Only approved go forward) */
  async function submitAll() {
    try {
      const approvedData = revenue.filter((r) => r.approved && !r.isSubmitted);
      if (approvedData.length === 0) {
        return alert("⚠️ No approved reports to submit. Please approve reports first.");
      }
      const res = await fetch(`${API_BASE}/api/revenue/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reports: approvedData }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${approvedData.length} approved reports submitted successfully!`);
        loadRevenue(); // Refresh
      } else alert(data.message || "Failed to submit reports");
    } catch (e) {
      console.error("Submit error:", e);
    }
  }

  /* 🔹 Calculate Total Value */
  const totalOrderValue = revenue.reduce(
    (sum, r) => sum + (Number(r.orderValue) || 0),
    0
  );
  const approvedCount = revenue.filter((r) => r.approved).length;
  const pendingCount = revenue.filter((r) => !r.approved).length;

  /* 🔹 Export Excel */
  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(revenue);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Revenue");
    XLSX.writeFile(wb, `Revenue_${user.empCode}.xlsx`);
  }

  if (loading) return <p>Loading revenue data...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        💰 Revenue Tracker (Manager View)
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
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle}/>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle}/>
        <button onClick={loadRevenue} style={btnBlueSmall}>🔍 Filter</button>
        <button onClick={exportToExcel} style={btnBlueSmall}>📤 Export Excel</button>
        <button onClick={addManualRow} style={btnBlueSmall}>➕ Add Manual Sale</button>
        <button onClick={submitAll} style={btnGreenSmall}>📨 Submit Approved ({approvedCount})</button>
      </div>

      {/* ✅ Total Value Summary */}
      <div style={{ 
        marginBottom: 15, 
        padding: "12px 20px", 
        background: "#d1fae5", 
        borderRadius: 8, 
        fontWeight: "bold", 
        fontSize: 16,
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
      }}>
        <span>💰 Total Revenue: ₹{totalOrderValue.toLocaleString("en-IN")}</span>
        <span>📊 Records: {revenue.length}</span>
        <span style={{ color: "#16a34a" }}>✅ Approved: {approvedCount}</span>
        <span style={{ color: "#f59e0b" }}>⏳ Pending: {pendingCount}</span>
      </div>

      {/* Table */}
      <div style={{ overflowY: "auto", maxHeight: "80vh", border: "1px solid #ccc" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Employee (Name + Code)</th>
              <th style={th}>Branch</th>
              <th style={th}>Region</th>
              <th style={th}>Manager</th>
              <th style={th}>Customer ID</th>
              <th style={th}>Customer Mobile</th>
              <th style={th}>Customer Name</th>
              <th style={th}>Customer Type</th>
              <th style={th}>Vertical</th>
              <th style={th}>Distributor Code</th>
              <th style={th}>Distributor Name</th>
              <th style={th}>Order Type</th>
              <th style={th}>Value (₹)</th>
              <th style={th}>Item</th>
              <th style={th}>PO No.</th>
              <th style={th}>Upload PO</th>
              <th style={th}>Uploaded PO</th>
              <th style={th}>Reported By</th>
              <th style={{ ...th, background: "#fef3c7" }}>Approved By</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {revenue.map((r, i) => (
              <tr key={r._id || i} style={{ borderBottom: "1px solid #ddd" }}>
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
                        updateManualRow(r._id, "branch", emp?.branch || "-");
                        updateManualRow(r._id, "region", emp?.region || "-");
                      }}
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

                <td style={td}>{r.branch}</td>
                <td style={td}>{r.region}</td>
                <td style={td}>{r.managerName}</td>
                <td style={td}>{r.customerId}</td>

                {/* Editable Fields */}
                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.customerMobile} onChange={(e) => updateManualRow(r._id, "customerMobile", e.target.value)} style={inputSmall}/>
                  ) : (r.customerMobile || "-")}
                </td>

                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.customerName} onChange={(e) => updateManualRow(r._id, "customerName", e.target.value)} style={inputSmall}/>
                  ) : (r.customerName || "-")}
                </td>

                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <select value={r.customerType} onChange={(e) => updateManualRow(r._id, "customerType", e.target.value)} style={inputSmall}>
                      <option value="">Select Type</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Contractor">Contractor</option>
                      <option value="End User">End User</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (r.customerType || "-")}
                </td>

                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <select value={r.vertical} onChange={(e) => updateManualRow(r._id, "vertical", e.target.value)} style={inputSmall}>
                      <option value="">Select Vertical</option>
                      <option value="EP">EP</option>
                      <option value="GFD">GFD</option>
                    </select>
                  ) : (r.vertical || "-")}
                </td>
                {/* Distributor Code */}
<td style={td}>
  {r.isManual && !r.saved ? (
    <input
      type="text"
      value={r.distributorCode || ""}
      onChange={(e) => updateManualRow(r._id, "distributorCode", e.target.value)}
      style={inputSmall}
      placeholder="Code"
    />
  ) : (
    r.distributorCode || "-"
  )}
</td>

{/* Distributor Name */}
<td style={td}>
  {r.isManual && !r.saved ? (
    <input
      type="text"
      value={r.distributorName || ""}
      onChange={(e) => updateManualRow(r._id, "distributorName", e.target.value)}
      style={inputSmall}
      placeholder="Name"
    />
  ) : (
    r.distributorName || "-"
  )}
</td>

               <td style={td}>
                  {r.isManual && !r.saved ? (
                    <select value={r.orderType} onChange={(e) => updateManualRow(r._id, "orderType", e.target.value)} style={inputSmall}>
                      <option value="Retail">Retail</option>
                      <option value="Project">Project</option>
                    </select>
                  ) : (r.orderType || "-")}
                </td>

                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="number" value={r.orderValue} onChange={(e) => updateManualRow(r._id, "orderValue", e.target.value)} style={inputSmall}/>
                  ) : (r.orderValue || "-")}
                </td>

                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.itemName} onChange={(e) => updateManualRow(r._id, "itemName", e.target.value)} style={inputSmall}/>
                  ) : (r.itemName || "-")}
                </td>

                <td style={td}>
                  {r.isManual && !r.saved ? (
                    <input type="text" value={r.poNumber} onChange={(e) => updateManualRow(r._id, "poNumber", e.target.value)} style={inputSmall}/>
                  ) : (r.poNumber || "-")}
                </td>

                {/* Upload PO */}
                <td style={td}>
                  {r.isManual && (
                    <input type="file" accept="image/*,.pdf" onChange={(e) => uploadPOFile(e, r._id)} style={{ width: "120px" }} />
                  )}
                </td>

                {/* Uploaded PO */}
                <td style={td}>
  {r.poFileUrl && r.poFileUrl !== "-" && r.poFileUrl.trim() !== "" ? (
    <button
      onClick={() => {
        const fileUrl = r.poFileUrl.startsWith("http")
          ? r.poFileUrl
          : `${API_BASE}${r.poFileUrl}`;
        setSelectedPO(fileUrl);
      }}
      style={linkBtn}
    >
      🖼️ View
    </button>
  ) : (
    r.isManual ? (
      <span style={{ color: "#aaa" }}>No File</span>
    ) : (
      "-"
    )
  )}
</td>
                <td style={td}>{r.isManual ? "Manager" : "Employee"}</td>

                {/* Approved By Column */}
                <td style={{ ...td, background: "#fef3c7" }}>
                  {r.approved ? (
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
                    <button onClick={() => saveManualSale({ ...r, reportedBy: "Manager", approved: true, approvedBy: user.name })} style={btnSave}>
                      🟢 Report
                    </button>
                  ) : r.approved ? (
                    <span style={{ color: "green", fontWeight: 600 }}>✅ Approved</span>
                  ) : (
                    <button onClick={() => approveRevenue(r._id)} style={btnApprove}>Approve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Popup ---------- */}
      {selectedPO && (
        <div style={overlay} onClick={() => setSelectedPO(null)}>
          <div style={popup} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setSelectedPO(null)}>✕</button>
            {selectedPO.endsWith(".pdf") ? (
              <iframe src={selectedPO} width="100%" height="600px"/>
            ) : (
              <img src={selectedPO} alt="PO" style={{ width: "100%", borderRadius: 8 }}/>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const th = { padding: "10px", borderBottom: "2px solid #ccc", fontSize: "13px", fontWeight: 600, background: "#f4f4f4", position: "sticky", top: 0, zIndex: 10 };
const td = { padding: "8px 10px", fontSize: "13px" };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" };
const inputSmall = { padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, width: "100px", fontSize: "12px" };
const btnBlueSmall = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" };
const btnGreenSmall = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" };
const btnSave = { background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontWeight: 600 };
const btnApprove = { background: "#facc15", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontWeight: 600 };
const linkBtn = { color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 };
const filterRow = { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const popup = { background: "#fff", padding: 16, borderRadius: 10, maxWidth: "90%", maxHeight: "90vh", overflow: "auto", position: "relative" };
const closeBtn = { position: "absolute", top: 10, right: 10, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
