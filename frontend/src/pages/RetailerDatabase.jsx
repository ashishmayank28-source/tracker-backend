import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RetailerDatabase({ readOnly = false }) {
  const { token, user } = useAuth();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  // Fetch retailers
  const fetchRetailers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/retailers/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRetailers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch retailers:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  // Filter retailers
  const filtered = retailers.filter((r) => {
    const matchSearch =
      !search ||
      r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      r.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.ownerMobile?.includes(search);
    const matchCity =
      !cityFilter || r.city?.toLowerCase().includes(cityFilter.toLowerCase());
    return matchSearch && matchCity;
  });

  // Get unique cities for filter
  const cities = [...new Set(retailers.map((r) => r.city).filter(Boolean))];

  return (
    <div style={{ padding: 10 }}>
      {/* Header with count and refresh */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          📊 Total Retailers: <span style={{ color: "#22c55e" }}>{filtered.length}</span>
        </div>
        <button
          onClick={fetchRetailers}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: 15,
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        <input
          type="text"
          placeholder="🔍 Search by Name, Owner, Mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            minWidth: 250,
          }}
        />
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            minWidth: 150,
          }}
        >
          <option value="">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          ⏳ Loading retailers...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 40,
          color: "#6b7280",
          background: "#f9fafb",
          borderRadius: 8,
        }}>
          📭 No retailers found. Add new retailers using "➕ Add Retailer" tile.
        </div>
      ) : (
        /* Table */
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: 1400,
          }}>
            <thead>
              <tr style={{ background: "#86c541" }}>
                {[
                  "Owner Mobile No.",
                  "Company GSTN",
                  "Company Name (As Per GST Certificate)",
                  "Company Owner (Full Name)",
                  "Company Email Address",
                  "Company Address",
                  "City",
                  "City PIN",
                  "Distributor Code",
                  "Distributor Name",
                  "CPM EID",
                  "CPM Name",
                  "Branch",
                  "Region",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 8px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "#000",
                      borderBottom: "2px solid #65a30d",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr
                  key={r._id}
                  style={{
                    background: idx % 2 === 0 ? "#f0fdf4" : "#dcfce7",
                    transition: "background 0.2s",
                  }}
                >
                  <td style={cellStyle}>{r.ownerMobile || "-"}</td>
                  <td style={cellStyle}>{r.companyGSTN || "-"}</td>
                  <td style={{ ...cellStyle, maxWidth: 200 }}>{r.companyName || "-"}</td>
                  <td style={cellStyle}>{r.ownerName || "-"}</td>
                  <td style={cellStyle}>{r.companyEmail || "-"}</td>
                  <td style={{ ...cellStyle, maxWidth: 200 }}>{r.companyAddress || "-"}</td>
                  <td style={cellStyle}>{r.city || "-"}</td>
                  <td style={cellStyle}>{r.cityPIN || "-"}</td>
                  <td style={cellStyle}>{r.distributorCode || "-"}</td>
                  <td style={cellStyle}>{r.distributorName || "-"}</td>
                  <td style={cellStyle}>{r.cpmEID || "-"}</td>
                  <td style={cellStyle}>{r.cpmName || "-"}</td>
                  <td style={cellStyle}>{r.branch || "-"}</td>
                  <td style={cellStyle}>{r.region || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer */}
      {!loading && filtered.length > 0 && (
        <div style={{
          marginTop: 20,
          padding: 15,
          background: "#f0fdf4",
          borderRadius: 8,
          display: "flex",
          gap: 30,
          flexWrap: "wrap",
          fontSize: 14,
        }}>
          <div><strong>Total:</strong> {filtered.length} retailers</div>
          <div><strong>Cities:</strong> {cities.length}</div>
          <div><strong>Added by:</strong> {user?.name || user?.empCode}</div>
        </div>
      )}
    </div>
  );
}

const cellStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #d1d5db",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
