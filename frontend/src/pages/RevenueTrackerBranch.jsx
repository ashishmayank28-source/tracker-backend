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

  /* 🔹 Fetch Branch Team */
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(
          `${API_BASE}/api/branch/reportees/${user.empCode}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setTeam(data || []);
      } catch (e) {
        console.error("Team fetch error:", e);
        setTeam([]);
      }
    }
    if (user?.empCode) fetchTeam();
  }, [token, user]);

  /* 🔹 Fetch Branch Revenue */
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
    XLSX.writeFile(
      wb,
      `Branch_Revenue_${new Date().toLocaleDateString()}.xlsx`
    );
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
        submittedBy: user.name,
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
        submittedBy: user.name,
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

  /* 🔹 Submit ALL approved BM entries to RM/Admin (not just manual) */
  async function submitToRMAdmin() {
    try {
      const approvedCount = revenue.filter((r) => r.approved || r.approvedBy).length;
      if (approvedCount === 0) {
        return alert("⚠️ No approved entries to submit.");
      }
      const res = await fetch(`${API_BASE}/api/revenue/submit-bm`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          reports: revenue.filter((r) => r.approved || r.approvedBy) 
        }),
      });
      const data = await res.json();
      alert(data.message || `✅ ${approvedCount} entries submitted to RM/Admin`);
      loadRevenue();
    } catch (err) {
      console.error("Submit Error:", err);
      alert("❌ Failed to submit entries");
    }
  }

  /* 🔹 Calculate totals */
  const totalOrderValue = revenue.reduce(
    (sum, r) => sum + (Number(r.orderValue) || 0),
    0
  );

  return (
    <div style={{ padding: 20 }}>
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
        <button onClick={loadRevenue} style={btnBlueSmall}>
          🔍 Filter
        </button>
        <button onClick={exportToExcel} style={btnBlueSmall}>
          📤 Export Excel
        </button>
        <button onClick={addManualRow} style={btnGreenSmall}>
          ➕ Add Manual Sale
        </button>
        {/* ✅ Submit button */}
        <button onClick={submitToRMAdmin} style={btnBlueSmall}>
          🚀 Submit to RM/Admin ({revenue.length})
        </button>
      </div>

      {/* ✅ Total Value Summary */}
      <div style={{ 
        marginBottom: 15, 
        padding: "12px 20px", 
        background: "#d1fae5", 
        borderRadius: 8, 
        fontWeight: "bold", 
        fontSize: 16,
        display: "inline-block"
      }}>
        💰 Total Revenue: ₹{totalOrderValue.toLocaleString("en-IN")} | Records: {revenue.length}
      </div>

      {/* Table */}
      <div
        style={{
          overflowY: "auto",
          maxHeight: "80vh",
          border: "1px solid #ccc",
          borderRadius: 6,
        }}
      >
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Customer ID</th>
              <th style={th}>Customer Mobile</th>
              <th style={th}>Employee</th>
              <th style={th}>Branch</th>
              <th style={th}>Region</th>
              <th style={th}>Customer</th>
              <th style={th}>Type</th>
              <th style={th}>Vertical</th>
              <th style={th}>Distributor Code</th>
              <th style={th}>Distributor Name</th>
              <th style={th}>Order Type</th>
              <th style={th}>Item</th>
              <th style={th}>Value (₹)</th>
              <th style={th}>PO No.</th>
              <th style={th}>PO File</th>
              <th style={th}>Approved By</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {revenue.length > 0 ? (
              revenue.map((r) => (
                <tr key={r._id}>
                  <td style={td}>
                    {r.date ? new Date(r.date).toLocaleDateString() : "-"}
                  </td>
                  <td style={td}>{r.customerId || "-"}</td>

                  {/* Customer Mobile */}
                  <td style={td}>
                    {r.isManual && !r.saved ? (
                      <input
                        type="text"
                        value={r.customerMobile}
                        onChange={(e) =>
                          updateManualRow(r._id, "customerMobile", e.target.value)
                        }
                        style={inputSmall}
                      />
                    ) : (
                      r.customerMobile || "-"
                    )}
                  </td>

                  {/* Employee */}
                  <td style={td}>
                    {`${r.empName || "-"} (${r.empCode || "-"})`}
                  </td>

                  <td style={td}>{r.branch}</td>
                  <td style={td}>{r.region}</td>
                  <td style={td}>{r.customerName}</td>
                  <td style={td}>{r.customerType}</td>
                  <td style={td}>{r.vertical}</td>
                  <td style={td}>{r.distributorCode}</td>
                  <td style={td}>{r.distributorName}</td>
                  <td style={td}>{r.orderType}</td>
                  <td style={td}>{r.itemName}</td>
                  <td style={td}>{r.orderValue}</td>
                  <td style={td}>{r.poNumber}</td>

                  {/* PO File */}
                  <td style={td}>
                    {r.poFileUrl && r.poFileUrl !== "-" && r.poFileUrl.trim() !== ""
                      ? (
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
                      )
                      : "-"}
                  </td>

                  {/* ✅ Approved By Fix */}
                  <td style={td}>
                    {r.approvedBy
                      ? r.approvedBy
                      : `${user.empCode} - ${user.name}`}
                  </td>

                  <td style={td}>
                    <span style={{ color: "green", fontWeight: 600 }}>
                      ✅ Approved
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="18" style={{ textAlign: "center", padding: 20 }}>
                  No submitted revenue found for this branch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ PO View Modal */}
      {selectedPO && (
        <div style={overlay} onClick={() => setSelectedPO(null)}>
          <div style={popup} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setSelectedPO(null)}>
              ✕ Close
            </button>
            {selectedPO.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={selectedPO}
                width="100%"
                height="600px"
                style={{ border: "1px solid #ccc", borderRadius: 8 }}
                title="PO Preview"
              />
            ) : (
              <img
                src={selectedPO}
                alt="PO"
                style={{
                  width: "100%",
                  maxWidth: "900px",
                  borderRadius: 8,
                  objectFit: "contain",
                }}
              />
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
const inputStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
};
const inputSmall = {
  padding: "4px 6px",
  border: "1px solid #ccc",
  borderRadius: 4,
  width: "120px",
  fontSize: "12px",
};
const btnBlueSmall = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "6px 12px",
  cursor: "pointer",
};
const btnGreenSmall = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "6px 12px",
  cursor: "pointer",
};
const btnView = {
  background: "#0ea5e9",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "4px 10px",
  cursor: "pointer",
};
const filterRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 16,
  alignItems: "center",
};
const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};
const popup = {
  background: "#fff",
  borderRadius: 10,
  padding: 16,
  maxWidth: "90%",
  maxHeight: "90vh",
  overflow: "auto",
  position: "relative",
};
const closeBtn = {
  position: "absolute",
  top: 10,
  right: 10,
  background: "#e11d48",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontWeight: "bold",
};
