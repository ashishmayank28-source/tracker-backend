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

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ marginBottom: 20 }}>📊 Reports Viewer</h3>

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

      {/* Reports Table */}
      {view === "reports" && (
        <>
          {loading ? (
            <p>Loading reports...</p>
          ) : (
            <table
              border="1"
              cellPadding="6"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "14px",
              }}
            >
              <thead style={{ background: "#f5f5f5" }}>
                <tr>
                  {[
                    "customerId",
                    "empCode",
                    "name",
                    "company",
                    "customerType",
                    "discussion",
                    "opportunityType",
                    "orderStatus",
                    "orderValue",
                    "nextMeeting",
                    "date",
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
                        value={filters[col] || ""}
                        onChange={(e) =>
                          setFilters({ ...filters, [col]: e.target.value })
                        }
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReports.length > 0 ? (
                  filteredReports.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.customerId}</td>
                      <td>{r.empCode}</td>
                      <td>{r.name}</td>
                      <td>{r.company}</td>
                      <td>{r.customerType}</td>
                      <td>{r.discussion}</td>
                      <td>{r.opportunityType}</td>
                      <td>{r.orderStatus}</td>
                      <td>{r.orderValue}</td>
                      <td>{r.nextMeeting}</td>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" style={{ textAlign: "center" }}>
                      No reports found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

            {/* Visits History */}
            <h4 style={{ marginBottom: 10 }}>📝 Visit History ({(customerHistory.visits || []).length} visits)</h4>
            {customerHistory.visits && customerHistory.visits.length > 0 ? (
              <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ background: "#e5e7eb" }}>
                  <tr>
                    <th>Date</th>
                    <th>Meeting Type</th>
                    <th>Discussion</th>
                    <th>Opportunity</th>
                    <th>Order Status</th>
                    <th>Order Value</th>
                    <th>Next Meeting</th>
                    <th>Emp Code</th>
                  </tr>
                </thead>
                <tbody>
                  {customerHistory.visits.map((v, i) => (
                    <tr key={i}>
                      <td>{v.date ? new Date(v.date).toLocaleDateString() : "-"}</td>
                      <td>{v.meetingType || "-"}</td>
                      <td style={{ maxWidth: 200, wordBreak: "break-word" }}>{v.discussion || "-"}</td>
                      <td>{v.opportunityType || "-"}</td>
                      <td>{v.orderStatus || "-"}</td>
                      <td>{v.orderValue || 0}</td>
                      <td>{v.nextMeetingDate ? new Date(v.nextMeetingDate).toLocaleDateString() : "-"}</td>
                      <td>{v.empCode || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No visits recorded for this customer.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
