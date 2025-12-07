// src/components/Layout.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
    setShowProfile(false);
  }

  function goToProfile() {
    navigate("/profile");
    setShowProfile(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={styles.header}>
        <Link to="/" style={styles.logo}>
          Sales Tracker
        </Link>

        {user && (
          <div ref={profileRef} style={{ position: "relative" }}>
            <button onClick={() => setShowProfile(!showProfile)} style={styles.avatarBtn}>
              <div style={styles.avatar}>
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  color: "#666",
                  transform: showProfile ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showProfile && (
              <div style={styles.dropdown}>
                {/* User Info */}
                <div style={styles.dropdownHeader}>
                  <div style={styles.dropdownAvatar}>
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div style={styles.dropdownInfo}>
                    <p style={styles.dropdownName}>{user.name}</p>
                    <p style={styles.dropdownCode}>{user.empCode}</p>
                    <span style={styles.dropdownRole}>{user.role}</span>
                  </div>
                </div>

                {/* Menu */}
                <div style={styles.dropdownMenu}>
                  <button onClick={goToProfile} style={styles.menuItem}>
                    <span style={styles.menuIcon}>👤</span>
                    View Profile
                  </button>
                  <div style={styles.divider}></div>
                  <button onClick={handleLogout} style={styles.menuItemLogout}>
                    <span style={styles.menuIcon}>🚪</span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: "16px" }}>{children}</main>

      {/* Footer */}
      <footer style={styles.footer}>
        © 2025 Sales Tracker. All rights reserved.
      </footer>
    </div>
  );
}

const styles = {
  header: {
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    padding: "12px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#667eea",
    textDecoration: "none",
  },
  avatarBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "none",
    border: "2px solid transparent",
    padding: "4px 8px 4px 4px",
    borderRadius: "30px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "700",
    fontSize: "16px",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: "280px",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    overflow: "hidden",
    zIndex: 1000,
    animation: "fadeIn 0.2s ease-out",
  },
  dropdownHeader: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  dropdownAvatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "700",
    fontSize: "20px",
    backdropFilter: "blur(10px)",
  },
  dropdownInfo: {
    flex: 1,
    minWidth: 0,
  },
  dropdownName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: "15px",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dropdownCode: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "12px",
    margin: "2px 0 6px",
  },
  dropdownRole: {
    display: "inline-block",
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    padding: "3px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "500",
  },
  dropdownMenu: {
    padding: "8px",
  },
  menuItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    background: "none",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#333",
    textAlign: "left",
    transition: "background 0.2s",
  },
  menuItemLogout: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    background: "none",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#ef4444",
    textAlign: "left",
    transition: "background 0.2s",
  },
  menuIcon: {
    fontSize: "18px",
  },
  divider: {
    height: "1px",
    background: "#eee",
    margin: "4px 0",
  },
  footer: {
    background: "#fff",
    padding: "16px",
    textAlign: "center",
    fontSize: "13px",
    color: "#888",
    boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
  },
};
