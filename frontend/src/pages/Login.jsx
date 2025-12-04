// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../auth.jsx";   // ✅ fixed import
import { roleToDashboardPath } from "../utils/roleToPath.js";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth() || {};   // ✅ safe destructure
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await login(loginId, password);

      if (data?.user?.role) {
        const path = roleToDashboardPath(data.user.role);
        navigate(path, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: 20, textAlign: "center" }}>
          🔑 Login
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <input
              type="text"
              placeholder="Employee Code / Login ID"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ marginBottom: 15 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: "14px",
              }}
            />
          </div>
          {error && (
            <p style={{ color: "red", fontSize: "13px", marginBottom: 15 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: "15px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
