import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function SubmittedReports({ empCode: propEmpCode }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // empCode – agar prop se mila to woh, nahi to logged-in user ka
  const emp = propEmpCode || user?.empCode;

  const [reports, setReports] = useState([]);
  const [from, setFrom] = useState(""); // Empty = no filter (show all)
  const [to, setTo] = useState("");     // Empty = no filter (show all)
  const [loading, setLoading] = useState(true);

  // Load reports with optional date filter
  async function loadReports(filterFrom, filterTo) {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();

      // empCode filter (manager/admin kya dekhna chahta hai)
      if (emp) params.append("empCode", emp);
      // Only add date params if provided (for filtering)
      if (filterFrom) params.append("from", filterFrom);
      if (filterTo) params.append("to", filterTo);

      // ✅ hierarchy-aware endpoint:
      // employee (apna khud ka data) → /api/customers/my-reports
      // manager/admin etc. → /api/reports/submitted
      const endpoint =
        user?.role?.toLowerCase() === "employee" && !propEmpCode
          ? `/api/customers/my-reports?${params.toString()}`
          : `/api/reports/submitted?${params.toString()}`;

      console.log("SubmittedReports fetching from:", API_BASE + endpoint);

      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      // backend kabhi direct array deta hai, kabhi {reports: [...]}
      const reportsArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.reports)
        ? data.reports
        : [];

      // normalize thoda sa so that table ko same keys milein
      const normalized = reportsArray.map((r) => ({
        ...r,
        customerId: r.customerId || r.customer_id,
        name: r.name || r.customerName || "-",
        mobile: r.mobile || r.customerMobile || r.customer_mobile || "-",
        company: r.company || r.company_name || "-",
        designation: r.designation || "-",
        customerType: r.customerType || "-",
        date: r.date || r.visitDate || r.createdAt,
        nextMeetingDate: r.nextMeetingDate || r.nextMeeting,
        expectedOrderDate: r.expectedOrderDate || r.expectedOrder,
        empCode:
          r.createdBy?.empCode || r.empCode || r.createdBy || r.emp_code || "-",
      }));

      // ✅ Sort by date descending (latest first - like WhatsApp)
      normalized.sort((a, b) => new Date(b.date) - new Date(a.date));

      console.log("SubmittedReports normalized:", normalized);
      setReports(normalized);
    } catch (err) {
      console.error("Failed to load submitted reports", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Load ALL reports on mount (no date filter)
  useEffect(() => {
    if (token) {
      loadReports(); // No params = load all
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, emp]);

  // ✅ Apply filter
  function applyFilter() {
    loadReports(from, to);
  }

  // ✅ Clear filter and show all
  function clearFilter() {
    setFrom("");
    setTo("");
    loadReports(); // Load all without filter
  }

  // Table Styles - Color coded as per image
  const th = {
    border: "1px solid #ddd",
    padding: "8px 6px",
    background: "#f5f5f5",
    fontWeight: "600",
    fontSize: "12px",
    whiteSpace: "nowrap",
  };
  const thYellow = { ...th, background: "#fef08a", color: "#854d0e" }; // Yellow for Employee Info
  const thOrange = { ...th, background: "#fed7aa", color: "#9a3412" }; // Orange for Meeting Info
  const thGreen = { ...th, background: "#bbf7d0", color: "#166534" };  // Green for Customer/Opportunity
  const td = { border: "1px solid #e5e7eb", padding: "6px", fontSize: "12px" };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 15 }}>
        📋 Submitted Reports
      </h2>

      {/* Date Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 15, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{ border: "1px solid #ccc", borderRadius: 6, padding: 6 }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{ border: "1px solid #ccc", borderRadius: 6, padding: 6 }}
        />
        <button
          onClick={applyFilter}
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "6px 14px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          🔍 Filter
        </button>
        {(from || to) && (
          <button
            onClick={clearFilter}
            style={{
              background: "#6b7280",
              color: "#fff",
              padding: "6px 14px",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : reports.length === 0 ? (
        <p>No reports found</p>
      ) : (
        <div style={{ overflowX: "auto", maxHeight: "75vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1800 }}>
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
              <th style={th}>History</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                {/* Yellow - Employee Info */}
                <td style={td}>{r.customerId || "-"}</td>
                <td style={td}>{r.empName || r.createdBy?.name || "-"} ({r.empCode || "-"})</td>
                <td style={td}>{r.location || r.area || "-"}</td>
                <td style={td}>{r.managerName || "-"}</td>
                <td style={td}>{r.branch || "-"}</td>
                <td style={td}>{r.region || "-"}</td>
                {/* Orange - Meeting Info */}
                <td style={td}>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                <td style={td}>{r.meetingType || "-"}</td>
                <td style={td}>{r.attendees || r.internalAttendees || "-"}</td>
                {/* Green - Customer & Opportunity */}
                <td style={td}>{r.customerType || "-"}</td>
                <td style={td}>{r.name || r.customerName || "-"}</td>
                <td style={td}>{r.mobile || r.customerMobile || "-"}</td>
                <td style={{ ...td, maxWidth: 200, wordBreak: "break-word" }}>{r.discussion || "-"}</td>
                <td style={td}>{r.opportunityType || "-"}</td>
                <td style={td}>{r.opportunityName || r.company || "-"}</td>
                <td style={td}>{r.orderStatus || "-"}</td>
                <td style={td}>{r.nextMeetingDate ? new Date(r.nextMeetingDate).toLocaleDateString() : "-"}</td>
                <td style={td}>{r.expectedOrderDate ? new Date(r.expectedOrderDate).toLocaleDateString() : "-"}</td>
                <td style={td}>
                  <button
                    onClick={() => {
                      if (r.customerId) {
                        navigate(`/customer-history/${r.customerId}`, {
                          state: { from: "submitted" },
                        });
                      }
                    }}
                    style={{
                      background: "#22c55e",
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
