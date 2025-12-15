import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function RetailerDatabaseTeam() {
  const { token, user } = useAuth();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  // Fetch retailers
  const fetchRetailers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (cityFilter) params.append("city", cityFilter);
      if (branchFilter) params.append("branch", branchFilter);
      if (regionFilter) params.append("region", regionFilter);

      const res = await fetch(`${API_BASE}/api/retailers/team?${params}`, {
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
  }, [token, search, cityFilter, branchFilter, regionFilter]);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  // Get unique values for filters
  const cities = [...new Set(retailers.map((r) => r.city).filter(Boolean))];
  const branches = [...new Set(retailers.map((r) => r.branch).filter(Boolean))];
  const regions = [...new Set(retailers.map((r) => r.region).filter(Boolean))];

  // Role-based filter visibility
  const showRegionFilter = user?.role === "Admin";
  const showBranchFilter = user?.role === "Admin" || user?.role === "RegionalManager";

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
          📊 Total Retailers: <span style={{ color: "#22c55e" }}>{retailers.length}</span>
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
          placeholder="🔍 Search by Name, Owner, Mobile, Emp..."
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
        
        {showRegionFilter && (
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}

        {showBranchFilter && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={selectStyle}
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
      ) : retailers.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 40,
          color: "#6b7280",
          background: "#f9fafb",
          borderRadius: 8,
        }}>
          📭 No retailers found.
        </div>
      ) : (
        /* Table */
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: 1600,
          }}>
            <thead>
              <tr>
                {/* Yellow columns - Emp EID and Emp Name */}
                <th style={{ ...headerStyle, background: "#fef08a" }}>Emp EID</th>
                <th style={{ ...headerStyle, background: "#fef08a" }}>Emp Name</th>
                {/* Green columns - Retailer data */}
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
                  <th key={h} style={{ ...headerStyle, background: "#86c541" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retailers.map((r, idx) => (
                <tr
                  key={r._id}
                  style={{
                    background: idx % 2 === 0 ? "#f0fdf4" : "#dcfce7",
                    transition: "background 0.2s",
                  }}
                >
                  {/* Yellow columns data */}
                  <td style={{ ...cellStyle, background: idx % 2 === 0 ? "#fefce8" : "#fef9c3" }}>
                    {r.createdBy || "-"}
                  </td>
                  <td style={{ ...cellStyle, background: idx % 2 === 0 ? "#fefce8" : "#fef9c3" }}>
                    {r.createdByName || "-"}
                  </td>
                  {/* Green columns data */}
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
      {!loading && retailers.length > 0 && (
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
          <div><strong>Total:</strong> {retailers.length} retailers</div>
          <div><strong>Cities:</strong> {cities.length}</div>
          <div><strong>Branches:</strong> {branches.length}</div>
          {showRegionFilter && <div><strong>Regions:</strong> {regions.length}</div>}
        </div>
      )}
    </div>
  );
}

const headerStyle = {
  padding: "12px 8px",
  textAlign: "left",
  fontWeight: 700,
  color: "#000",
  borderBottom: "2px solid #65a30d",
  whiteSpace: "nowrap",
};

const cellStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #d1d5db",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const selectStyle = {
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  minWidth: 150,
};






