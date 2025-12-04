// src/pages/VendorLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function VendorLogin() {
  const { setAuth } = useAuth();   // ✅ direct setAuth use kar rahe hain
  const navigate = useNavigate();

  const [empCode, setEmpCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empCode, password }), // ✅ empCode bhej rahe hain
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      // ✅ Save token + user (NO second API call)
      setAuth(data.token, data.user);

      // Redirect to Vendor Dashboard
      navigate("/vendor/dashboard");
    } catch (err) {
      console.error("Vendor login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <div style={{ padding: 24, maxWidth: 400, width: "100%", background: "#fff", borderRadius: 12, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
        <h3 style={{ fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 20 }}>Vendor Login</h3>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 500 }}>Emp Code</label>
            <input
              type="text"
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              placeholder="Enter Vendor Emp Code"
              required
              style={{ marginTop: 6, width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              required
              style={{ marginTop: 6, width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6 }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px 0",
              borderRadius: 6,
              background: "#2563eb",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              border: "none",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error && <p style={{ color: "red", marginTop: 12, textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}
