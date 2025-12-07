// src/auth.jsx
import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roleToDashboardPath } from "./utils/roleToPath.js";

const API_BASE =
  (import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000")
    .replace(/\/+$/, "") || "";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

  /* ---------- LOGIN (API based) ---------- */
  async function login(loginId, password, options = {}) {
    const { skipRedirect = false } = options;
    
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Login failed (${res.status})`);

    // save to state
    setAuth(data.token, data.user);

    // redirect to dashboard (unless skipRedirect is true)
    if (!skipRedirect && data?.user?.role) {
      const dashboardPath = roleToDashboardPath(data.user.role);
      navigate(dashboardPath, { replace: true });
    }

    return { user: data.user, token: data.token };
  }

  /* ---------- SET AUTH (manual save for VendorLogin, etc.) ---------- */
  function setAuth(token, user) {
    setToken(token || "");
    setUser(user || null);

    localStorage.setItem("token", token || "");
    localStorage.setItem("user", JSON.stringify(user || null));
  }

  /* ---------- LOGOUT ---------- */
  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  }

  const value = useMemo(
    () => ({ token, user, login, setAuth, logout, API_BASE }),
    [token, user]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
