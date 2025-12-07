import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { API_BASE, token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!user?.empCode) return;
    
    fetch(`${API_BASE}/api/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setAddress(data.courierAddress || "");
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load profile" }))
      .finally(() => setLoading(false));
  }, [user?.empCode, API_BASE, token]);

  async function saveAddress() {
    setSaving(true);
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch(`${API_BASE}/api/users/${profile.empCode}/address`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courierAddress: address }),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      setProfile({ ...profile, courierAddress: address });
      setEditingAddress(false);
      setMessage({ type: "success", text: "Address updated!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: "#666", marginTop: 12 }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.loadingContainer}>
        <p style={{ color: "#666" }}>Profile not found</p>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      {/* Background gradient */}
      <div style={styles.bgGradient}></div>
      
      <div style={styles.container}>
        {/* Back Button */}
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          ← Back
        </button>

        {/* Profile Card */}
        <div style={styles.card}>
          {/* Header Section */}
          <div style={styles.header}>
            <div style={styles.avatarRing}>
              <div style={styles.avatar}>
                {profile.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
            <h1 style={styles.name}>{profile.name}</h1>
            <p style={styles.empCode}>{profile.empCode}</p>
            <span style={styles.roleBadge}>{profile.role}</span>
          </div>

          {/* Message */}
          {message.text && (
            <div style={{
              ...styles.message,
              background: message.type === "success" ? "#dcfce7" : "#fee2e2",
              color: message.type === "success" ? "#166534" : "#dc2626",
            }}>
              {message.text}
            </div>
          )}

          {/* Info Sections */}
          <div style={styles.infoContainer}>
            {/* Personal Info */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>👤</span>
                <span style={styles.sectionTitle}>Personal Information</span>
              </div>
              <div style={styles.infoGrid}>
                <InfoRow icon="📧" label="Email" value={profile.email} />
                <InfoRow icon="📱" label="Mobile" value={profile.mobile} />
                {profile.mobile2 && <InfoRow icon="📞" label="Mobile 2" value={profile.mobile2} />}
                <InfoRow icon="💼" label="Designation" value={profile.designation} />
              </div>
            </div>

            {/* Work Info */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>🏢</span>
                <span style={styles.sectionTitle}>Work Information</span>
              </div>
              <div style={styles.infoGrid}>
                <InfoRow icon="📍" label="Area" value={profile.area} />
                <InfoRow icon="🏬" label="Branch" value={profile.branch} />
                <InfoRow icon="🌍" label="Region" value={profile.region} />
                {profile.reportTo?.length > 0 && (
                  <InfoRow icon="👨‍💼" label="Reports To" value={profile.reportTo.map(m => m.name).join(", ")} />
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>📦</span>
                <span style={styles.sectionTitle}>Delivery Address</span>
                {!editingAddress && (
                  <button onClick={() => setEditingAddress(true)} style={styles.editBtn}>
                    ✏️ Edit
                  </button>
                )}
              </div>
              
              {editingAddress ? (
                <div style={styles.editBox}>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    style={styles.textarea}
                    placeholder="Enter your delivery address..."
                  />
                  <div style={styles.editActions}>
                    <button onClick={saveAddress} disabled={saving} style={styles.saveBtn}>
                      {saving ? "Saving..." : "💾 Save"}
                    </button>
                    <button onClick={() => { setEditingAddress(false); setAddress(profile.courierAddress || ""); }} style={styles.cancelBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p style={styles.addressText}>
                  {profile.courierAddress || "No address set. Click Edit to add."}
                </p>
              )}
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪 Logout
          </button>
        </div>

        <p style={styles.footer}>Contact admin to update other details</p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoLabel}>
        <span style={{ marginRight: 8 }}>{icon}</span>
        {label}
      </div>
      <div style={styles.infoValue}>{value || "Not set"}</div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: "100vh",
    background: "#f0f2f5",
    position: "relative",
    overflow: "hidden",
  },
  bgGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "280px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f64f59 100%)",
    borderRadius: "0 0 50% 50% / 0 0 30px 30px",
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "480px",
    margin: "0 auto",
    padding: "20px 16px",
  },
  backBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "20px",
    backdropFilter: "blur(10px)",
  },
  card: {
    background: "#fff",
    borderRadius: "24px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    overflow: "hidden",
    animation: "fadeIn 0.4s ease-out",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "40px 24px 30px",
    textAlign: "center",
  },
  avatarRing: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f64f59, #c471ed, #12c2e9)",
    padding: "4px",
    margin: "0 auto 16px",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
    fontWeight: "700",
    color: "#667eea",
  },
  name: {
    color: "#fff",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 4px",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },
  empCode: {
    color: "rgba(255,255,255,0.8)",
    fontSize: "14px",
    margin: "0 0 12px",
  },
  roleBadge: {
    display: "inline-block",
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    backdropFilter: "blur(10px)",
  },
  message: {
    margin: "16px",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    textAlign: "center",
  },
  infoContainer: {
    padding: "20px",
  },
  section: {
    background: "#f8f9fa",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "16px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
    gap: "8px",
  },
  sectionIcon: {
    fontSize: "18px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  editBtn: {
    background: "none",
    border: "1px solid #667eea",
    color: "#667eea",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    cursor: "pointer",
  },
  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#fff",
    borderRadius: "10px",
  },
  infoLabel: {
    fontSize: "13px",
    color: "#666",
    display: "flex",
    alignItems: "center",
  },
  infoValue: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#333",
    textAlign: "right",
    maxWidth: "60%",
    wordBreak: "break-word",
  },
  editBox: {
    marginTop: "12px",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    border: "2px solid #e0e0e0",
    borderRadius: "12px",
    fontSize: "14px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  editActions: {
    display: "flex",
    gap: "10px",
    marginTop: "12px",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    background: "#f0f0f0",
    color: "#666",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
  },
  addressText: {
    fontSize: "14px",
    color: "#555",
    padding: "12px",
    background: "#fff",
    borderRadius: "10px",
    margin: 0,
    lineHeight: "1.5",
  },
  logoutBtn: {
    width: "calc(100% - 40px)",
    margin: "0 20px 20px",
    padding: "14px",
    background: "linear-gradient(135deg, #ff6b6b, #ee5a5a)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
  },
  footer: {
    textAlign: "center",
    fontSize: "12px",
    color: "#999",
    marginTop: "16px",
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f2f5",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e0e0e0",
    borderTopColor: "#667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};
