import { useState, useEffect } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function UserProfileManager() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch all users
  useEffect(() => {
    fetchUsers();
  }, [token]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }

  function openEditor(user) {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      mobile2: user.mobile2 || "",
      designation: user.designation || "",
      area: user.area || "",
      branch: user.branch || "",
      region: user.region || "",
      courierAddress: user.courierAddress || "",
    });
    setMessage({ type: "", text: "" });
  }

  function closeEditor() {
    setEditingUser(null);
    setFormData({});
  }

  async function saveUser() {
    if (!editingUser) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch(`${API_BASE}/api/users/${editingUser.empCode}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      setMessage({ type: "success", text: "✅ User updated successfully!" });
      
      // Update local state
      setUsers(users.map(u => 
        u.empCode === editingUser.empCode ? { ...u, ...formData } : u
      ));
      
      setTimeout(() => {
        closeEditor();
      }, 1500);
    } catch (err) {
      setMessage({ type: "error", text: "❌ " + err.message });
    } finally {
      setSaving(false);
    }
  }

  // Filter users
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.empCode?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  // Count incomplete profiles
  const incompleteCount = users.filter(u => 
    !u.email || !u.mobile || !u.designation
  ).length;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>👥 User Profile Manager</h1>
        <p style={styles.subtitle}>Update personal information for all users</p>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{users.length}</span>
          <span style={styles.statLabel}>Total Users</span>
        </div>
        <div style={{ ...styles.statCard, background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <span style={styles.statNumber}>{incompleteCount}</span>
          <span style={styles.statLabel}>Incomplete Profiles</span>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="🔍 Search by name, emp code, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* User Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Mobile</th>
              <th style={styles.th}>Designation</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isIncomplete = !user.email || !user.mobile || !user.designation;
              return (
                <tr key={user.empCode} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.miniAvatar}>
                        {user.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={styles.userName}>{user.name}</div>
                        <div style={styles.userCode}>{user.empCode}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.roleBadge}>{user.role}</span>
                  </td>
                  <td style={styles.td}>
                    {user.email || <span style={styles.notSet}>Not set</span>}
                  </td>
                  <td style={styles.td}>
                    {user.mobile || <span style={styles.notSet}>Not set</span>}
                  </td>
                  <td style={styles.td}>
                    {user.designation || <span style={styles.notSet}>Not set</span>}
                  </td>
                  <td style={styles.td}>
                    {isIncomplete ? (
                      <span style={styles.statusIncomplete}>⚠️ Incomplete</span>
                    ) : (
                      <span style={styles.statusComplete}>✅ Complete</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => openEditor(user)} style={styles.editBtn}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div style={styles.modalOverlay} onClick={closeEditor}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Profile</h2>
              <button onClick={closeEditor} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.modalUserInfo}>
              <div style={styles.modalAvatar}>
                {editingUser.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{editingUser.name}</h3>
                <p style={{ margin: 0, color: "#666" }}>{editingUser.empCode} • {editingUser.role}</p>
              </div>
            </div>

            {message.text && (
              <div style={{
                ...styles.message,
                background: message.type === "success" ? "#dcfce7" : "#fee2e2",
                color: message.type === "success" ? "#166534" : "#dc2626",
              }}>
                {message.text}
              </div>
            )}

            <div style={styles.formGrid}>
              <FormField
                label="Name"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
              />
              <FormField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(v) => setFormData({ ...formData, email: v })}
              />
              <FormField
                label="Mobile"
                value={formData.mobile}
                onChange={(v) => setFormData({ ...formData, mobile: v })}
              />
              <FormField
                label="Mobile 2"
                value={formData.mobile2}
                onChange={(v) => setFormData({ ...formData, mobile2: v })}
              />
              <FormField
                label="Designation"
                value={formData.designation}
                onChange={(v) => setFormData({ ...formData, designation: v })}
              />
              <FormField
                label="Area"
                value={formData.area}
                onChange={(v) => setFormData({ ...formData, area: v })}
              />
              <FormField
                label="Branch"
                value={formData.branch}
                onChange={(v) => setFormData({ ...formData, branch: v })}
              />
              <FormField
                label="Region"
                value={formData.region}
                onChange={(v) => setFormData({ ...formData, region: v })}
              />
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={styles.label}>Courier Address</label>
                <textarea
                  value={formData.courierAddress}
                  onChange={(e) => setFormData({ ...formData, courierAddress: e.target.value })}
                  rows={2}
                  style={styles.textarea}
                  placeholder="Enter delivery address..."
                />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={closeEditor} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={saveUser} disabled={saving} style={styles.saveBtn}>
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function FormField({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#333",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: "4px 0 0",
  },
  statsRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "20px",
  },
  statCard: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    padding: "20px 24px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    minWidth: "160px",
  },
  statNumber: {
    fontSize: "32px",
    fontWeight: "700",
  },
  statLabel: {
    fontSize: "13px",
    opacity: 0.9,
  },
  searchBox: {
    marginBottom: "20px",
  },
  searchInput: {
    width: "100%",
    maxWidth: "400px",
    padding: "12px 16px",
    fontSize: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "12px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  tableWrapper: {
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#666",
    background: "#f8f9fa",
    borderBottom: "2px solid #e0e0e0",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "14px 16px",
    fontSize: "13px",
    verticalAlign: "middle",
  },
  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  miniAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "14px",
  },
  userName: {
    fontWeight: "600",
    color: "#333",
  },
  userCode: {
    fontSize: "12px",
    color: "#888",
  },
  roleBadge: {
    display: "inline-block",
    padding: "4px 10px",
    background: "#e0e7ff",
    color: "#4338ca",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "500",
  },
  notSet: {
    color: "#f59e0b",
    fontStyle: "italic",
    fontSize: "12px",
  },
  statusIncomplete: {
    color: "#f59e0b",
    fontSize: "12px",
  },
  statusComplete: {
    color: "#22c55e",
    fontSize: "12px",
  },
  editBtn: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    background: "#fff",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "540px",
    maxHeight: "90vh",
    overflow: "auto",
    animation: "fadeIn 0.2s ease-out",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #eee",
  },
  modalTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
  },
  closeBtn: {
    background: "#f0f0f0",
    border: "none",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "16px",
  },
  modalUserInfo: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px 24px",
    background: "#f8f9fa",
  },
  modalAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "24px",
  },
  message: {
    margin: "16px 24px 0",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "14px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    padding: "20px 24px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#555",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "10px",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "10px",
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    padding: "20px 24px",
    borderTop: "1px solid #eee",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    background: "#f0f0f0",
    color: "#666",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "500",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    color: "#666",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e0e0e0",
    borderTopColor: "#667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "12px",
  },
};

