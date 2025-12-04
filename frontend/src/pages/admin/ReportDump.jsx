import { useEffect, useState } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000").replace(/\/+$/, "");

export default function ReportDump() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");
      let url = `${API_BASE}/api/reports/dump`;
      if (from && to) url += `?from=${from}&to=${to}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadCSV = () => {
    if (!reports.length) return;

    const headers = Object.keys(reports[0]);
    const rows = reports.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_dump_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headers = reports.length
    ? Object.keys(reports[0])
    : ["customerId", "name", "mobile", "company", "designation", "createdBy", "customerCreatedAt", "visitDate"];

  return (
    <div style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
      {/* Top bar with filter + actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Left: Date Filter + Buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <span>to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button
            onClick={fetchReports}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Filter
          </button>
          <button
            onClick={fetchReports}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              background: "#555",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Right: Download CSV */}
        <button
          onClick={downloadCSV}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            background: "green",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          ⬇ Download CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflow: "auto", maxHeight: "70vh", border: "1px solid #ccc", borderRadius: "6px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
            <tr>
              {headers.map((key) => (
                <th
                  key={key}
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "600",
                  }}
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: "12px", textAlign: "center" }}>
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: "12px", textAlign: "center", color: "red" }}>
                  {error}
                </td>
              </tr>
            ) : reports.length ? (
              reports.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  {headers.map((key) => (
                    <td
                      key={key}
                      style={{
                        border: "1px solid #ddd",
                        padding: "6px 8px",
                      }}
                    >
                      {String(row[key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} style={{ padding: "12px", textAlign: "center" }}>
                  No reports found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
