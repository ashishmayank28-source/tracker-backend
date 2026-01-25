import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth.jsx";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

// ✅ Customer List Component - Shows customers by type
export default function CustomerList({ customerType, readOnly = false, onBack }) {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/customer-database/my?type=${customerType}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [token, customerType]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter customers
  const filtered = customers.filter((c) => {
    const matchSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search) ||
      c.customerUID?.toLowerCase().includes(search.toLowerCase());
    const matchCity =
      !cityFilter || c.city?.toLowerCase().includes(cityFilter.toLowerCase());
    return matchSearch && matchCity;
  });

  // Get unique cities
  const cities = [...new Set(customers.map((c) => c.city).filter(Boolean))];

  // Get type-specific icon
  const getIcon = () => {
    const icons = {
      "Retailer": "🏪",
      "Electrician": "⚡",
      "Architect": "🏛️",
      "Interior Designer": "🎨",
      "Builder": "🏗️",
      "Developer": "🏢",
    };
    return icons[customerType] || "👤";
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filtered.map((c) => ({
      "Customer UID": c.customerUID,
      "Name": c.name,
      "Mobile": c.mobile,
      "Company/Firm": c.companyName || c.firmName || "-",
      "City": c.city,
      "Email": c.email || "-",
      "Address": c.address || "-",
      "PIN": c.pinCode || "-",
      "Created By": c.createdByName || "-",
      "Created At": new Date(c.createdAt).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, customerType);
    XLSX.writeFile(wb, `${customerType}_Database_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={{ padding: 10 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          {onBack && (
            <button onClick={onBack} style={backBtnStyle}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {getIcon()} {customerType} Database
          </div>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            Total: <span style={{ color: "#22c55e", fontWeight: 600 }}>{filtered.length}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={exportToExcel} style={exportBtnStyle}>
            📥 Export Excel
          </button>
          <button onClick={fetchCustomers} style={refreshBtnStyle}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 15, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 Search by Name, UID, Mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInputStyle}
        />
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

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 40,
          background: "#f8fafc",
          borderRadius: 12,
          color: "#64748b",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{getIcon()}</div>
          <p>No {customerType}s found in your database</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={thStyle}>Customer UID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Mobile</th>
                <th style={thStyle}>Company/Firm</th>
                <th style={thStyle}>City</th>
                <th style={thStyle}>Created At</th>
                {!readOnly && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c._id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#3b82f6" }}>
                    {c.customerUID}
                  </td>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={tdStyle}>{c.mobile}</td>
                  <td style={tdStyle}>{c.companyName || c.firmName || "-"}</td>
                  <td style={tdStyle}>{c.city}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  {!readOnly && (
                    <td style={tdStyle}>
                      <button style={viewBtnStyle}>👁️ View</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============ Styles ============ */
const backBtnStyle = {
  padding: "8px 16px",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
};

const refreshBtnStyle = {
  padding: "8px 16px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};

const exportBtnStyle = {
  padding: "8px 16px",
  background: "#22c55e",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};

const searchInputStyle = {
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  minWidth: 250,
};

const selectStyle = {
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  minWidth: 150,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle = {
  padding: "12px 10px",
  textAlign: "left",
  borderBottom: "2px solid #e2e8f0",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #f1f5f9",
};

const viewBtnStyle = {
  padding: "4px 10px",
  background: "#e0f2fe",
  color: "#0369a1",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};
