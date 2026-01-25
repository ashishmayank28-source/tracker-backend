// frontend/src/pages/GuestLogin.jsx
import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";

export default function GuestLogin() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth() || {};
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Use regular login API
      const { user } = await login(loginId, password, { skipRedirect: true });

      // ✅ Check if user is Guest
      if (user?.role?.toLowerCase() !== "guest") {
        logout();
        setError("❌ This is Guest login only. Please use the correct login page for your role.");
        setLoading(false);
        return;
      }

      // Navigate to Guest Dashboard
      navigate("/guest-dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Guest login failed");
    } finally {
      setLoading(false);
    }
  }

  const roleColor = "#6b7280"; // Gray for guest

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
        {/* Guest Icon */}
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
          👤
        </div>

        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: 8,
            textAlign: "center",
            color: "#1e293b",
          }}
        >
          Guest Login
        </h2>

        <p
          style={{
            fontSize: "13px",
            color: "#64748b",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Limited access dashboard
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#475569",
                marginBottom: 6,
              }}
            >
              Login ID / Emp Code
            </label>
            <input
              type="text"
              placeholder="Enter your guest ID"
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
              onFocus={(e) => (e.target.style.borderColor = roleColor)}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#475569",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Enter guest password"
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
              onFocus={(e) => (e.target.style.borderColor = roleColor)}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "13px",
                padding: "12px",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
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
            onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
          >
            {loading ? "Logging in..." : "Login as Guest"}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: "13px",
            color: "#94a3b8",
          }}
        >
          <a href="/" style={{ color: roleColor, textDecoration: "none" }}>
            ← Back to Login Selection
          </a>
        </div>
      </div>
    </div>
  );
}
