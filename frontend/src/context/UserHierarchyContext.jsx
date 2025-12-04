// src/context/UserHierarchyContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const UserHierarchyContext = createContext();

export function UserHierarchyProvider({ children }) {
  const [users, setUsers] = useState([]);
  const { token, user } = useAuth();

  useEffect(() => {
    async function loadUsers() {
      if (!token || !user) return;
      try {
        // ✅ Admin → all, RM/BM/Manager → team
        const endpoint =
          user.role === "Admin" ? "/api/users/all" : "/api/users/team";

        const res = await fetch(
          `http://localhost:5000${endpoint}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error(`Failed ${res.status}`);

        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error("Unexpected response:", data);
          setUsers([]);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        setUsers([]);
      }
    }
    loadUsers();
  }, [token, user]);

  // 🔹 Helper: filter reportees (extra use-case)
  function getReportees(currentUser) {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "RegionalManager":
        return users.filter((u) => u.region === currentUser.region);
      case "BranchManager":
        return users.filter((u) => u.branch === currentUser.branch);
      case "Manager":
        return users.filter((u) =>
          u.reportTo?.some((r) => r.empCode === currentUser.empCode)
        );
      default:
        return [];
    }
  }

  return (
    <UserHierarchyContext.Provider value={{ users, setUsers, getReportees }}>
      {children}
    </UserHierarchyContext.Provider>
  );
}

export function useUserHierarchy() {
  return useContext(UserHierarchyContext);
}
