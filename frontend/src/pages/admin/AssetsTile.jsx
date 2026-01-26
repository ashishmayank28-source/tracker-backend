import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth.jsx";
import SampleBoardsAllocationAdmin from "./SampleBoardsAllocationAdmin.jsx";
import AssetRequestAdmin from "./AssetRequestAdmin.jsx"; // ✅ Asset Request

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

/* --- Reusable Wrapper with Back --- */
function TileWrapper({ onBack, children }) {
  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}>
        ← Back
      </button>
      {children}
    </div>
  );
}

export default function AssetsTile({ isGuest = false }) {
  const { token } = useAuth();
  const [activeTile, setActiveTile] = useState("assets");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedLot, setSelectedLot] = useState("all");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate year options (current year and past 5 years)
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const lots = ["all", "Lot 1", "Lot 2", "Lot 3"];

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/api/assignments/summary?year=${selectedYear}`;
      if (selectedLot !== "all") url += `&lot=${encodeURIComponent(selectedLot)}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Summary fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedYear, selectedLot]);

  useEffect(() => {
    if (activeTile === "assets") {
      fetchSummary();
    }
  }, [activeTile, fetchSummary]);

  return (
    <div style={{ padding: 20 }}>
      {/* --- Main Assets Dashboard --- */}
      {activeTile === "assets" && (
        <div>
          <h2 style={{ marginBottom: 20 }}>🎁 Assets Management</h2>

          {/* Quick Action Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 15, marginBottom: 30 }}>
            <ActionTile 
              icon="📦" 
              label="Sample Boards Allocation" 
              color="#3b82f6"
              onClick={() => setActiveTile("sample")} 
            />
            <ActionTile 
              icon="📋" 
              label="Asset Requests" 
              color="#f97316"
              onClick={() => setActiveTile("assetRequests")} 
            />
            <ActionTile 
              icon="📊" 
              label="View Ledger" 
              color="#8b5cf6"
              onClick={() => window.location.href = "/admin/ledger"} 
            />
          </div>

          {/* Year & Lot Filter */}
          <div style={{ 
            background: "#f8fafc", 
            padding: 20, 
            borderRadius: 12, 
            marginBottom: 25,
            border: "1px solid #e2e8f0"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>📅 Filter by Year & Lot</h3>
            <div style={{ display: "flex", gap: 15, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <label style={{ fontWeight: 600, marginRight: 8 }}>Year:</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={selectStyle}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, marginRight: 8 }}>Lot:</label>
                <select 
                  value={selectedLot} 
                  onChange={(e) => setSelectedLot(e.target.value)}
                  style={selectStyle}
                >
                  {lots.map(l => <option key={l} value={l}>{l === "all" ? "All Lots" : l}</option>)}
                </select>
              </div>
              <button onClick={fetchSummary} style={refreshBtnStyle}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <p>Loading summary...</p>
          ) : summary ? (
            <div>
              {/* Overview Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 15, marginBottom: 25 }}>
                <SummaryCard 
                  label="Total Production" 
                  value={summary.totalProduction || 0} 
                  icon="🏭" 
                  color="#3b82f6" 
                />
                <SummaryCard 
                  label="Total Assigned" 
                  value={summary.totalAssigned || 0} 
                  icon="📤" 
                  color="#8b5cf6" 
                />
                <SummaryCard 
                  label="Total Used" 
                  value={summary.totalUsed || 0} 
                  icon="✅" 
                  color="#22c55e" 
                />
                <SummaryCard 
                  label="In Stock" 
                  value={summary.totalStock || 0} 
                  icon="📦" 
                  color="#f59e0b" 
                />
              </div>

              {/* Lot-wise Breakdown */}
              {selectedLot === "all" && summary.lotBreakdown && (
                <div style={{ marginBottom: 25 }}>
                  <h3 style={{ marginBottom: 15 }}>📊 Lot-wise Breakdown ({selectedYear})</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 15 }}>
                    {["Lot 1", "Lot 2", "Lot 3"].map(lot => {
                      const lotData = summary.lotBreakdown[lot] || { production: 0, assigned: 0, used: 0, stock: 0 };
                      return (
                        <div key={lot} style={lotCardStyle}>
                          <h4 style={{ margin: "0 0 12px 0", color: "#1e40af" }}>{lot}</h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
                            <div>🏭 Production:</div><div style={{ fontWeight: 600 }}>{lotData.production}</div>
                            <div>📤 Assigned:</div><div style={{ fontWeight: 600 }}>{lotData.assigned}</div>
                            <div>✅ Used:</div><div style={{ fontWeight: 600, color: "#22c55e" }}>{lotData.used}</div>
                            <div>📦 Stock:</div><div style={{ fontWeight: 600, color: "#f59e0b" }}>{lotData.stock}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Item-wise Summary */}
              {summary.itemSummary && summary.itemSummary.length > 0 && (
                <div style={{ marginBottom: 25 }}>
                  <h3 style={{ marginBottom: 15 }}>📋 Item-wise Summary</h3>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={thStyle}>Item Name</th>
                        <th style={thStyle}>Production</th>
                        <th style={thStyle}>Assigned</th>
                        <th style={thStyle}>Used</th>
                        <th style={thStyle}>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.itemSummary.map((item, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{item.name}</td>
                          <td style={tdStyle}>{item.production}</td>
                          <td style={tdStyle}>{item.assigned}</td>
                          <td style={{ ...tdStyle, color: "#22c55e", fontWeight: 600 }}>{item.used}</td>
                          <td style={{ 
                            ...tdStyle, 
                            fontWeight: 700, 
                            color: item.available > 0 ? "#16a34a" : "#dc2626" 
                          }}>
                            {item.available}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Person-wise Stock */}
              {summary.personStock && summary.personStock.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: 15 }}>👥 Person-wise Stock Status</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: "#f1f5f9" }}>
                          <th style={thStyle}>Person</th>
                          <th style={thStyle}>Role</th>
                          <th style={thStyle}>Total Assigned</th>
                          <th style={thStyle}>Used</th>
                          <th style={thStyle}>Available</th>
                          <th style={thStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.personStock.map((person, i) => {
                          const available = (person.assigned || 0) - (person.used || 0);
                          return (
                            <tr key={i} style={{ background: available <= 0 ? "#fee2e2" : "white" }}>
                              <td style={tdStyle}>
                                <strong>{person.name}</strong>
                                <br />
                                <span style={{ fontSize: 12, color: "#6b7280" }}>{person.empCode}</span>
                              </td>
                              <td style={tdStyle}>{person.role || "-"}</td>
                              <td style={tdStyle}>{person.assigned}</td>
                              <td style={{ ...tdStyle, color: "#f59e0b", fontWeight: 600 }}>{person.used}</td>
                              <td style={{ 
                                ...tdStyle, 
                                fontWeight: 700, 
                                color: available > 0 ? "#16a34a" : "#dc2626" 
                              }}>
                                {available}
                              </td>
                              <td style={tdStyle}>
                                {available > 0 ? (
                                  <span style={{ background: "#d1fae5", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                                    ✅ Available
                                  </span>
                                ) : (
                                  <span style={{ background: "#fee2e2", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                                    ❌ Exhausted
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>No data available. Click Refresh to load.</p>
          )}
        </div>
      )}

      {/* --- Sample Boards Allocation --- */}
      {activeTile === "sample" && (
        <SampleBoardsAllocationAdmin onBack={() => setActiveTile("assets")} isGuest={isGuest} />
      )}

      {/* --- Asset Requests Management --- */}
      {activeTile === "assetRequests" && (
        <TileWrapper onBack={() => setActiveTile("assets")}>
          <AssetRequestAdmin />
        </TileWrapper>
      )}
    </div>
  );
}

/* --- Action Tile Component --- */
function ActionTile({ icon, label, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        padding: 20,
        background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
        border: `2px solid ${color}`,
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.2s",
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600, color }}>{label}</div>
    </div>
  );
}

/* --- Summary Card Component --- */
function SummaryCard({ label, value, icon, color }) {
  return (
    <div style={{
      padding: 20,
      background: "white",
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color }}>{value.toLocaleString()}</div>
        </div>
        <div style={{ fontSize: 32 }}>{icon}</div>
      </div>
    </div>
  );
}

/* --- Styles --- */
const backBtnStyle = {
  marginBottom: 20,
  padding: "8px 16px",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
};

const selectStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  minWidth: 120,
};

const refreshBtnStyle = {
  padding: "8px 16px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
};

const lotCardStyle = {
  padding: 16,
  background: "white",
  borderRadius: 10,
  border: "2px solid #bfdbfe",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  borderBottom: "2px solid #e2e8f0",
  fontWeight: 600,
  fontSize: 13,
};

const tdStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
};
