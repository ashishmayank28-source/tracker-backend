// src/context/AuthContext.jsx
import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roleToDashboardPath } from "../utils/roleToPath.js";

const API_BASE =
  (import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000")
    .replace(/\/+$/, "") || "";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

  // ✅ login function
  async function login(loginId, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Login failed (${res.status})`);

    setToken(data.token || "");
    setUser(data.user || null);

    localStorage.setItem("token", data.token || "");
    localStorage.setItem("user", JSON.stringify(data.user || null));

    // 🚀 Redirect user based on role (using data.user, not global user)
    if (data?.user?.role) {
      const dashboardPath = roleToDashboardPath(data.user.role);
      navigate(dashboardPath, { replace: true });
    }

    return data;
  }

  // ✅ logout function
  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true }); // back to login selector
  }

  const value = useMemo(
    () => ({ token, user, login, logout, API_BASE }),
    [token, user]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
