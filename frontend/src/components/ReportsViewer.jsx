// frontend/src/components/ReportsViewer.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000")
  .replace(/\/+$/, "");

export default function ReportsViewer() {
  const { token } = useAuth();

  // ✅ Empty dates = load ALL reports (no filter)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("reports"); // reports | summary

  // Filters
  const [filters, setFilters] = useState({});
  const [summaryFilters, setSummaryFilters] = useState({});

  // ✅ Customer ID Search
  const [searchCustomerId, setSearchCustomerId] = useState("");
  const [customerHistory, setCustomerHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Table Styles - Color coded as per format
  const thBase = { border: "1px solid #ddd", padding: "8px 6px", fontWeight: "600", fontSize: "11px", whiteSpace: "nowrap" };
  const thYellow = { ...thBase, background: "#fef08a", color: "#854d0e" };
  const thOrange = { ...thBase, background: "#fed7aa", color: "#9a3412" };
  const thGreen = { ...thBase, background: "#bbf7d0", color: "#166534" };
  const tdStyle = { border: "1px solid #e5e7eb", padding: "6px", fontSize: "11px" };
  const filterInput = { width: "100%", fontSize: "10px", padding: "3px", border: "1px solid #ddd", borderRadius: 3 };

  /* ---------- Load submitted reports ---------- */
  async function loadReports(filterFrom, filterTo) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // Only add date params if provided
      if (filterFrom) params.append("from", filterFrom);
      if (filterTo) params.append("to", filterTo);

      const res = await fetch(`${API_BASE}/api/reports/submitted?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // ✅ Sort by date descending (latest first)
      const sorted = (data.reports || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setReports(sorted);
    } catch (err) {
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Load summary ---------- */
  async function loadSummary(filterFrom, filterTo) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterFrom) params.append("from", filterFrom);
      if (filterTo) params.append("to", filterTo);

      const res = await fetch(`${API_BASE}/api/reports/summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSummary(data.summary || []);
    } catch (err) {
      console.error("Summary load error:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Auto-load ALL reports on mount ---------- */
  useEffect(() => {
    if (token) {
      if (view === "reports") {
        loadReports(); // No date filter = load all
      } else {
        loadSummary();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token]);

  /* ---------- Apply filter handler ---------- */
  function applyFilter() {
    if (view === "reports") {
      loadReports(from, to);
    } else {
      loadSummary(from, to);
    }
  }

  /* ---------- Clear filter ---------- */
  function clearFilter() {
    setFrom("");
    setTo("");
    if (view === "reports") {
      loadReports();
    } else {
      loadSummary();
    }
  }

  /* ---------- Search Customer History ---------- */
  async function searchCustomerHistory() {
    if (!searchCustomerId.trim()) return;
    try {
      setHistoryLoading(true);
      // ✅ Correct endpoint: /api/customers/:id/history
      const res = await fetch(
        `${API_BASE}/api/customers/${encodeURIComponent(searchCustomerId.trim())}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setCustomerHistory(data);
        setShowHistoryModal(true);
      } else {
        alert(data.message || "Customer not found");
        setCustomerHistory(null);
      }
    } catch (err) {
      console.error("Search error:", err);
      alert("Failed to search customer");
    } finally {
      setHistoryLoading(false);
    }
  }

  /* ---------- Filter Helpers ---------- */
  const filteredReports = reports.filter((r) =>
    Object.entries(filters).every(([key, val]) =>
      !val ? true : String(r[key] || "").toLowerCase().includes(val.toLowerCase())
    )
  );

  const filteredSummary = summary.filter((row) =>
    Object.entries(summaryFilters).every(([key, val]) =>
      !val ? true : String(row[key] || "").toLowerCase().includes(val.toLowerCase())
    )
  );

  /* ---------- Refresh Data ---------- */
  function handleRefresh() {
    if (view === "reports") {
      loadReports(from, to);
    } else {
      loadSummary(from, to);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>📊 Reports Viewer</h3>
        <button
          onClick={handleRefresh}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Toggle buttons */}
      <div style={{ marginBottom: 15 }}>
        <button
          onClick={() => setView("reports")}
          style={{
            padding: "6px 12px",
            marginRight: 10,
            background: view === "reports" ? "#1976d2" : "#f0f0f0",
            color: view === "reports" ? "#fff" : "#000",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          📑 Submitted Reports
        </button>
        <button
          onClick={() => setView("summary")}
          style={{
            padding: "6px 12px",
            background: view === "summary" ? "#1976d2" : "#f0f0f0",
            color: view === "summary" ? "#fff" : "#000",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          📌 Summary Reports
        </button>
      </div>

      {/* Date Filters */}
      <div
        style={{
          marginBottom: 15,
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label style={{ marginRight: 5 }}>From:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ padding: "4px" }}
          />
        </div>
        <div>
          <label style={{ marginRight: 5 }}>To:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ padding: "4px" }}
          />
        </div>
        <button
          onClick={applyFilter}
          style={{
            padding: "6px 12px",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
            background: "#f0f0f0",
          }}
        >
          Apply
        </button>
        {(from || to) && (
          <button
            onClick={clearFilter}
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
              background: "#6b7280",
              color: "#fff",
            }}
          >
            ✕ Clear
          </button>
        )}

        {/* ✅ Total Count Display */}
        <span style={{
          marginLeft: "auto",
          padding: "6px 14px",
          background: "#e0f2fe",
          borderRadius: "6px",
          fontWeight: "600",
          color: "#0369a1",
          fontSize: "14px",
        }}>
          Total Calls: {view === "reports" ? filteredReports.length : filteredSummary.length}
        </span>
      </div>

      {/* ✅ Search Box for Customer ID */}
      <div style={{
        marginBottom: 15,
        display: "flex",
        gap: "10px",
        alignItems: "center",
        background: "#fef3c7",
        padding: "10px 15px",
        borderRadius: "8px",
        border: "1px solid #fcd34d",
      }}>
        <label style={{ fontWeight: "600", color: "#92400e" }}>🔍 Search Customer:</label>
        <input
          type="text"
          placeholder="Enter Customer ID..."
          value={searchCustomerId}
          onChange={(e) => setSearchCustomerId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchCustomerHistory()}
          style={{
            padding: "6px 12px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            width: "200px",
          }}
        />
        <button
          onClick={searchCustomerHistory}
          disabled={historyLoading}
          style={{
            padding: "6px 14px",
            background: "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: historyLoading ? "wait" : "pointer",
            fontWeight: "600",
          }}
        >
          {historyLoading ? "Searching..." : "View History"}
        </button>
      </div>

      {/* Reports Table - New Format */}
      {view === "reports" && (
        <>
          {loading ? (
            <p>Loading reports...</p>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: "70vh" }}>
            <table
              border="1"
              cellPadding="6"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "12px",
                minWidth: 1800,
              }}
            >
              <thead style={{ position: "sticky", top: 0 }}>
                <tr>
                  {/* Yellow Columns - Employee Info */}
                  <th style={thYellow}>Customer ID</th>
                  <th style={thYellow}>Employee Name & (Emp Code)</th>
                  <th style={thYellow}>Location</th>
                  <th style={thYellow}>Manager Name</th>
                  <th style={thYellow}>Branch</th>
                  <th style={thYellow}>Region</th>
                  {/* Orange Columns - Meeting Info */}
                  <th style={thOrange}>Submission Date</th>
                  <th style={thOrange}>Meeting Type</th>
                  <th style={thOrange}>Internal Meeting Attendees</th>
                  {/* Green Columns - Customer & Opportunity */}
                  <th style={thGreen}>Customer Type</th>
                  <th style={thGreen}>Customer Name</th>
                  <th style={thGreen}>Customer Mob No.</th>
                  <th style={thGreen}>Discussion</th>
                  <th style={thGreen}>Opportunity Type</th>
                  <th style={thGreen}>Opportunity Name</th>
                  <th style={thGreen}>Order Status</th>
                  <th style={thGreen}>Next Meeting Date</th>
                  <th style={thGreen}>Expected Date of Order</th>
                </tr>
                {/* Filter Row */}
                <tr style={{ background: "#f9fafb" }}>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.customerId || ""} onChange={(e) => setFilters({...filters, customerId: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.empCode || ""} onChange={(e) => setFilters({...filters, empCode: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.location || ""} onChange={(e) => setFilters({...filters, location: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.managerName || ""} onChange={(e) => setFilters({...filters, managerName: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.branch || ""} onChange={(e) => setFilters({...filters, branch: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.region || ""} onChange={(e) => setFilters({...filters, region: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.date || ""} onChange={(e) => setFilters({...filters, date: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.meetingType || ""} onChange={(e) => setFilters({...filters, meetingType: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.attendees || ""} onChange={(e) => setFilters({...filters, attendees: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.customerType || ""} onChange={(e) => setFilters({...filters, customerType: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.name || ""} onChange={(e) => setFilters({...filters, name: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.mobile || ""} onChange={(e) => setFilters({...filters, mobile: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.discussion || ""} onChange={(e) => setFilters({...filters, discussion: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.opportunityType || ""} onChange={(e) => setFilters({...filters, opportunityType: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.company || ""} onChange={(e) => setFilters({...filters, company: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.orderStatus || ""} onChange={(e) => setFilters({...filters, orderStatus: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.nextMeeting || ""} onChange={(e) => setFilters({...filters, nextMeeting: e.target.value})} /></th>
                  <th><input style={filterInput} placeholder="Filter..." value={filters.expectedOrderDate || ""} onChange={(e) => setFilters({...filters, expectedOrderDate: e.target.value})} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length > 0 ? (
                  filteredReports.map((r, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      {/* Yellow - Employee Info */}
                      <td style={tdStyle}>{r.customerId || "-"}</td>
                      <td style={tdStyle}>{r.empName || r.createdBy?.name || "-"} ({r.empCode || "-"})</td>
                      <td style={tdStyle}>{r.location || r.area || "-"}</td>
                      <td style={tdStyle}>{r.managerName || "-"}</td>
                      <td style={tdStyle}>{r.branch || "-"}</td>
                      <td style={tdStyle}>{r.region || "-"}</td>
                      {/* Orange - Meeting Info */}
                      <td style={tdStyle}>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                      <td style={tdStyle}>{r.meetingType || "-"}</td>
                      <td style={tdStyle}>{r.attendees || r.internalAttendees || "-"}</td>
                      {/* Green - Customer & Opportunity */}
                      <td style={tdStyle}>{r.customerType || "-"}</td>
                      <td style={tdStyle}>{r.name || r.customerName || "-"}</td>
                      <td style={tdStyle}>{r.mobile || r.customerMobile || "-"}</td>
                      <td style={{ ...tdStyle, maxWidth: 200, wordBreak: "break-word" }}>{r.discussion || "-"}</td>
                      <td style={tdStyle}>{r.opportunityType || "-"}</td>
                      <td style={tdStyle}>{r.company || r.opportunityName || "-"}</td>
                      <td style={tdStyle}>{r.orderStatus || "-"}</td>
                      <td style={tdStyle}>{r.nextMeeting ? new Date(r.nextMeeting).toLocaleDateString() : "-"}</td>
                      <td style={tdStyle}>{r.expectedOrderDate ? new Date(r.expectedOrderDate).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="18" style={{ textAlign: "center", padding: 20 }}>
                      No reports found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}

      {/* Summary Table */}
      {view === "summary" && (
        <>
          {loading ? (
            <p>Loading summary...</p>
          ) : (
            <table
              border="1"
              cellPadding="6"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                textAlign: "center",
                fontSize: "14px",
              }}
            >
              <thead style={{ background: "#f5f5f5" }}>
                <tr>
                  {[
                    "empCode",
                    "empName",
                    "externalCount",
                    "internalCount",
                    "retailer",
                    "distributor",
                    "architect",
                    "electrician",
                    "endUser",
                  ].map((col) => (
                    <th key={col}>
                      {col}
                      <br />
                      <input
                        style={{
                          width: "100%",
                          fontSize: "12px",
                          marginTop: 4,
                          padding: "2px 4px",
                        }}
                        placeholder="Filter..."
                        value={summaryFilters[col] || ""}
                        onChange={(e) =>
                          setSummaryFilters({
                            ...summaryFilters,
                            [col]: e.target.value,
                          })
                        }
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSummary.length > 0 ? (
                  filteredSummary.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.empCode}</td>
                      <td>{row.empName}</td>
                      <td>{row.externalCount}</td>
                      <td>{row.internalCount}</td>
                      <td>{row.retailer}</td>
                      <td>{row.distributor}</td>
                      <td>{row.architect}</td>
                      <td>{row.electrician}</td>
                      <td>{row.endUser}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center" }}>
                      No summary found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ✅ Customer History Modal */}
      {showHistoryModal && customerHistory && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            maxWidth: "900px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>📋 Customer History: {customerHistory.customerId}</h3>
              <button
                onClick={() => { setShowHistoryModal(false); setCustomerHistory(null); setSearchCustomerId(""); }}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ✕
              </button>
            </div>

            {/* Customer Info */}
            <div style={{ background: "#f3f4f6", padding: "12px", borderRadius: "8px", marginBottom: 15 }}>
              <p><strong>Name:</strong> {customerHistory.name || "NA"}</p>
              <p><strong>Mobile:</strong> {customerHistory.customerMobile || customerHistory.mobile || "NA"}</p>
              <p><strong>Company:</strong> {customerHistory.company || "NA"}</p>
              <p><strong>Customer Type:</strong> {customerHistory.customerType || "NA"}</p>
              <p><strong>Vertical:</strong> {customerHistory.vertical || "NA"}</p>
            </div>

            {/* Visits History - Same Format */}
            <h4 style={{ marginBottom: 10 }}>📝 Visit History ({(customerHistory.visits || []).length} visits)</h4>
            {customerHistory.visits && customerHistory.visits.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
              <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", minWidth: 1200 }}>
                <thead>
                  <tr>
                    <th style={thYellow}>Employee Name & (Emp Code)</th>
                    <th style={thYellow}>Location</th>
                    <th style={thYellow}>Branch</th>
                    <th style={thYellow}>Region</th>
                    <th style={thOrange}>Submission Date</th>
                    <th style={thOrange}>Meeting Type</th>
                    <th style={thOrange}>Internal Attendees</th>
                    <th style={thGreen}>Customer Type</th>
                    <th style={thGreen}>Discussion</th>
                    <th style={thGreen}>Opportunity Type</th>
                    <th style={thGreen}>Order Status</th>
                    <th style={thGreen}>Next Meeting Date</th>
                    <th style={thGreen}>Expected Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customerHistory.visits.map((v, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={tdStyle}>{v.empName || "-"} ({v.empCode || "-"})</td>
                      <td style={tdStyle}>{v.location || v.area || "-"}</td>
                      <td style={tdStyle}>{v.branch || "-"}</td>
                      <td style={tdStyle}>{v.region || "-"}</td>
                      <td style={tdStyle}>{v.date ? new Date(v.date).toLocaleDateString() : "-"}</td>
                      <td style={tdStyle}>{v.meetingType || "-"}</td>
                      <td style={tdStyle}>{v.attendees || "-"}</td>
                      <td style={tdStyle}>{v.customerType || customerHistory.customerType || "-"}</td>
                      <td style={{ ...tdStyle, maxWidth: 200, wordBreak: "break-word" }}>{v.discussion || "-"}</td>
                      <td style={tdStyle}>{v.opportunityType || "-"}</td>
                      <td style={tdStyle}>{v.orderStatus || "-"}</td>
                      <td style={tdStyle}>{v.nextMeetingDate ? new Date(v.nextMeetingDate).toLocaleDateString() : "-"}</td>
                      <td style={tdStyle}>{v.expectedOrderDate ? new Date(v.expectedOrderDate).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <p>No visits recorded for this customer.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
