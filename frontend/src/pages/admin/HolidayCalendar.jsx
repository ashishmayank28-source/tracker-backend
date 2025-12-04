import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function HolidayCalendar() {
  const { token } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    description: "",
    type: "Company",
  });
  const [editingId, setEditingId] = useState(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2);
  const holidayTypes = ["National", "Regional", "Company", "Optional"];

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/holidays?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch holidays error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedYear]);

  useEffect(() => {
    if (token) fetchHolidays();
  }, [token, fetchHolidays]);

  // Add/Update holiday
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.date || !formData.name) {
      return alert("❌ Date and Name are required");
    }

    try {
      const url = editingId 
        ? `${API_BASE}/api/holidays/${editingId}`
        : `${API_BASE}/api/holidays`;
      
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || "✅ Holiday saved!");
        setShowForm(false);
        setFormData({ date: "", name: "", description: "", type: "Company" });
        setEditingId(null);
        fetchHolidays();
      } else {
        alert(data.message || "❌ Failed to save holiday");
      }
    } catch (err) {
      console.error("Save holiday error:", err);
      alert("❌ Error saving holiday");
    }
  }

  // Delete holiday
  async function handleDelete(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/holidays/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || "✅ Holiday deleted!");
        fetchHolidays();
      } else {
        alert(data.message || "❌ Failed to delete");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  // Edit holiday
  function handleEdit(holiday) {
    setFormData({
      date: holiday.date.slice(0, 10),
      name: holiday.name,
      description: holiday.description || "",
      type: holiday.type || "Company",
    });
    setEditingId(holiday._id);
    setShowForm(true);
  }

  // Get type badge color
  function getTypeColor(type) {
    const colors = {
      National: "#dc2626",
      Regional: "#2563eb",
      Company: "#16a34a",
      Optional: "#9333ea",
    };
    return colors[type] || "#6b7280";
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 15,
      }}>
        <h2 style={{ margin: 0 }}>🗓️ Holiday Calendar Management</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={selectStyle}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={fetchHolidays} style={btnBlue}>
            🔄 Refresh
          </button>
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ date: "", name: "", description: "", type: "Company" });
            }} 
            style={btnGreen}
          >
            ➕ Add Holiday
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {editingId ? "✏️ Edit Holiday" : "➕ Add New Holiday"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 15 }}>
                <label style={labelStyle}>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={labelStyle}>Holiday Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Diwali, Republic Day"
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={labelStyle}>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={inputStyle}
                >
                  {holidayTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details..."
                  style={{ ...inputStyle, height: 80, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={btnGray}>
                  Cancel
                </button>
                <button type="submit" style={btnGreen}>
                  {editingId ? "💾 Update" : "➕ Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holiday Type Legend */}
      <div style={{ 
        display: "flex", 
        gap: 20, 
        marginBottom: 20, 
        padding: 12, 
        background: "#f8fafc", 
        borderRadius: 8,
        flexWrap: "wrap",
      }}>
        {holidayTypes.map((type) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ 
              background: getTypeColor(type), 
              color: "white", 
              padding: "2px 8px", 
              borderRadius: 4, 
              fontSize: 12,
              fontWeight: 600,
            }}>
              {type}
            </span>
          </div>
        ))}
      </div>

      {/* Holidays Table */}
      {loading ? (
        <p>Loading holidays...</p>
      ) : holidays.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "#f8fafc", borderRadius: 8 }}>
          <p style={{ fontSize: 18, color: "#6b7280" }}>📅 No holidays added for {selectedYear}</p>
          <button onClick={() => setShowForm(true)} style={btnGreen}>
            ➕ Add First Holiday
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Day</th>
                <th style={thStyle}>Holiday Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h, idx) => {
                const date = new Date(h.date);
                const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                return (
                  <tr key={h._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={tdStyle}>{dayNames[date.getDay()]}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{h.name}</td>
                    <td style={tdStyle}>
                      <span style={{ 
                        background: getTypeColor(h.type), 
                        color: "white", 
                        padding: "3px 10px", 
                        borderRadius: 4, 
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {h.type}
                      </span>
                    </td>
                    <td style={tdStyle}>{h.description || "-"}</td>
                    <td style={tdStyle}>
                      <button onClick={() => handleEdit(h)} style={btnSmallBlue}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(h._id, h.name)} style={btnSmallRed}>
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div style={{ 
        marginTop: 20, 
        padding: 16, 
        background: "#f0fdf4", 
        borderRadius: 8, 
        border: "1px solid #bbf7d0",
      }}>
        <strong>📊 Summary for {selectedYear}:</strong> Total Holidays: {holidays.length}
        {holidayTypes.map((type) => {
          const count = holidays.filter((h) => h.type === type).length;
          return count > 0 ? (
            <span key={type} style={{ marginLeft: 15 }}>
              | {type}: <strong>{count}</strong>
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}

/* Styles */
const selectStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
};

const btnBlue = {
  padding: "8px 16px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
};

const btnGreen = {
  padding: "8px 16px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
};

const btnGray = {
  padding: "8px 16px",
  background: "#6b7280",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const btnSmallBlue = {
  padding: "4px 10px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
  marginRight: 6,
};

const btnSmallRed = {
  padding: "4px 10px",
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100,
};

const modalContent = {
  background: "white",
  padding: 24,
  borderRadius: 12,
  width: "90%",
  maxWidth: 450,
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
  fontSize: 14,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
  boxSizing: "border-box",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
};

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: 600,
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle = {
  padding: "12px 16px",
};

