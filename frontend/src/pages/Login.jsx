// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { roleToDashboardPath } from "../utils/roleToPath.js";
import { useNavigate } from "react-router-dom";

// Role mapping for validation - expected role => allowed user roles
const roleMapping = {
  "Employee": ["employee"],
  "Manager": ["manager"],
  "BranchManager": ["branchmanager", "branch manager"],
  "Branch Manager": ["branchmanager", "branch manager"],
  "RegionalManager": ["regionalmanager", "regional manager"],
  "Regional Manager": ["regionalmanager", "regional manager"],
  "Admin": ["admin"],
  "Vendor": ["vendor"]
};

export default function Login({ defaultRole }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout, API_BASE } = useAuth() || {};
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Login with skipRedirect so we can validate role first
      const { user, token } = await login(loginId, password, { skipRedirect: true });

      if (user?.role) {
        // Check if user's role matches the expected role from login page
        if (defaultRole) {
          const allowedRoles = roleMapping[defaultRole] || [defaultRole.toLowerCase()];
          const userRole = user.role.toLowerCase();
          
          // Check if user's role is in the allowed roles for this login page
          if (!allowedRoles.includes(userRole)) {
            // Clear auth and show error
            logout();
            
            // Map user's actual role to friendly name
            const roleNames = {
              employee: "Employee",
              manager: "Manager",
              branchmanager: "Branch Manager",
              regionalmanager: "Regional Manager",
              admin: "Admin",
              vendor: "Vendor"
            };
            const actualRoleName = roleNames[userRole] || user.role;
            
            setError(`❌ Access denied! Your account is registered as "${actualRoleName}". Please use the correct login page.`);
            setLoading(false);
            return;
          }
        }
        
        // Role matches, redirect to dashboard
        const path = roleToDashboardPath(user.role);
        navigate(path, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  // Get role-specific colors
  const getRoleColor = () => {
    const colors = {
      Employee: "#3b82f6",
      Manager: "#8b5cf6",
      BranchManager: "#10b981",
      "Branch Manager": "#10b981",
      RegionalManager: "#f59e0b",
      "Regional Manager": "#f59e0b",
      Admin: "#ef4444",
      Vendor: "#06b6d4"
    };
    return colors[defaultRole] || "#1976d2";
  };

  const roleColor = getRoleColor();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        }}
      >
        {/* Role Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `${roleColor}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 28,
          }}
        >
          {defaultRole === "Employee" && "👷"}
          {defaultRole === "Manager" && "📋"}
          {(defaultRole === "BranchManager" || defaultRole === "Branch Manager") && "🏢"}
          {(defaultRole === "RegionalManager" || defaultRole === "Regional Manager") && "🌍"}
          {defaultRole === "Admin" && "⚙️"}
          {defaultRole === "Vendor" && "🏭"}
          {!defaultRole && "🔑"}
        </div>

        <h2 style={{ 
          fontSize: "22px", 
          fontWeight: "bold", 
          marginBottom: 8, 
          textAlign: "center",
          color: "#1e293b"
        }}>
          {defaultRole ? `${defaultRole.replace("Manager", " Manager")} Login` : "Login"}
        </h2>
        
        <p style={{ 
          fontSize: "13px", 
          color: "#64748b", 
          textAlign: "center", 
          marginBottom: 24 
        }}>
          Enter your credentials to continue
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ 
              display: "block", 
              fontSize: "13px", 
              fontWeight: 500, 
              color: "#475569",
              marginBottom: 6 
            }}>
              Employee Code / Login ID
            </label>
            <input
              type="text"
              placeholder="e.g., EMP001"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = roleColor}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: "block", 
              fontSize: "13px", 
              fontWeight: 500, 
              color: "#475569",
              marginBottom: 6 
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = roleColor}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          {error && (
            <div style={{ 
              background: "#fef2f2", 
              border: "1px solid #fecaca",
              color: "#dc2626", 
              fontSize: "13px", 
              padding: "12px",
              borderRadius: 8,
              marginBottom: 16 
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#94a3b8" : roleColor,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "transform 0.1s, opacity 0.2s",
            }}
            onMouseDown={(e) => !loading && (e.target.style.transform = "scale(0.98)")}
            onMouseUp={(e) => e.target.style.transform = "scale(1)"}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ 
          marginTop: 20, 
          textAlign: "center", 
          fontSize: "13px", 
          color: "#94a3b8" 
        }}>
          <a href="/" style={{ color: roleColor, textDecoration: "none" }}>
            ← Back to Login Selection
          </a>
        </div>
      </div>
    </div>
  );
}
