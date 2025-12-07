import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";

import AdminDashboard from "./pages/AdminDashboard.jsx";
import LoginSelector from "./pages/LoginSelector.jsx";
import EmployeeLogin from "./pages/EmployeeLogin.jsx";
import ManagerLogin from "./pages/ManagerLogin.jsx";
import BranchManagerLogin from "./pages/BranchManagerLogin.jsx";
import RegionalManagerLogin from "./pages/RegionalManagerLogin.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import RegionalDashboard from "./pages/RegionalDashboard.jsx";
import BranchManagerDashboard from "./pages/BranchManagerDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import CustomerHistory from "./pages/CustomerHistory.jsx";
import MyReports from "./pages/MyReports.jsx";
import CustomerFullHistory from "./pages/CustomerFullHistory.jsx";
import { UserHierarchyProvider } from "./context/UserHierarchyContext.jsx";
import SampleBoardAllocationRegional from "./pages/SampleBoardsAllocationRegional.jsx";
import VendorLogin from "./pages/VendorLogin.jsx";
import VendorDashboard from "./pages/VendorDashboard.jsx";
import Profile from "./pages/Profile.jsx";
import UserProfileManager from "./pages/admin/UserProfileManager.jsx";

/* ---------- Guards ---------- */
function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role?.toLowerCase() !== "admin") return <p>⛔ Access denied</p>;
  return children;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const userRole = user.role?.toLowerCase();
  const allowed = roles.map((r) => r.toLowerCase());
  if (!allowed.includes(userRole)) return <p>⛔ Access denied</p>;
  return children;
}

/* ---------- Login ---------- */
function Login() {
  const { login } = useAuth() || {};
  const navigate = useNavigate();
  const [empCode, setEmpCode] = useState("TEST100");
  const [password, setPassword] = useState("123456");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const loggedInUser = await login(empCode.trim(), password);
      if (!loggedInUser) throw new Error("No user returned");
      const role = loggedInUser.role?.toLowerCase();

      if (role === "admin") navigate("/admin");
      else if (role === "manager") navigate("/manager-dashboard");
      else if (role === "branchmanager") navigate("/branch-dashboard");
      else if (role === "regionalmanager") navigate("/regional-dashboard");
      else if (role === "vendor") navigate("/vendor/dashboard"); // ✅ Vendor redirect
      else navigate("/employee-dashboard");
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 max-w-md w-full bg-white rounded-xl shadow-lg space-y-4">
        <h3 className="text-xl font-bold text-center">Login</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Employee Code</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {loading ? "..." : "Sign in"}
          </button>
        </form>
        {err && <p className="text-red-500 mt-2 text-center">{err}</p>}
      </div>
    </div>
  );
}

/* ---------- Final App ---------- */
export default function App() {
  return (
    <UserHierarchyProvider>
      <Layout>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LoginSelector />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/employee" element={<EmployeeLogin />} />
          <Route path="/login/manager" element={<ManagerLogin />} />
          <Route path="/login/branch" element={<BranchManagerLogin />} />
          <Route path="/login/regional" element={<RegionalManagerLogin />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/vendor/login" element={<VendorLogin />} />

          {/* Employee view for managers/admin */}
          <Route
            path="/employee-view/:empCode"
            element={
              <RequireRole roles={["Manager", "BranchManager", "RegionalManager", "Admin"]}>
                <EmployeeDashboard readOnly />
              </RequireRole>
            }
          />

          {/* Employee */}
          <Route
            path="/employee-dashboard"
            element={
              <RequireRole roles={["Employee"]}>
                <EmployeeDashboard />
              </RequireRole>
            }
          />
          <Route path="/my-reports" element={<MyReports />} />
          <Route path="/customer-history/:id" element={<CustomerHistory />} />
          <Route path="/customer-full-history/:customerId" element={<CustomerFullHistory />} />

          {/* Manager */}
          <Route
            path="/manager-dashboard"
            element={
              <RequireRole roles={["Manager"]}>
                <ManagerDashboard />
              </RequireRole>
            }
          />

          {/* Branch Manager */}
          <Route
            path="/branch-dashboard"
            element={
              <RequireRole roles={["BranchManager"]}>
                <BranchManagerDashboard />
              </RequireRole>
            }
          />

          {/* Regional Manager */}
          <Route
            path="/regional-dashboard"
            element={
              <RequireRole roles={["RegionalManager", "Admin"]}>
                <RegionalDashboard />
              </RequireRole>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/user-profiles"
            element={
              <RequireAdmin>
                <UserProfileManager />
              </RequireAdmin>
            }
          />
          
          {/* Vendor */}
          <Route
            path="/vendor/dashboard"
            element={
              <RequireRole roles={["Vendor"]}>
                <VendorDashboard />
              </RequireRole>
            }
          />

          {/* Profile for all logged-in users */}
          <Route
            path="/profile"
            element={
              <RequireRole roles={["Employee", "Manager", "BranchManager", "RegionalManager", "Admin", "Vendor"]}>
                <Profile />
              </RequireRole>
            }
          />

          {/* Others */}
          <Route
            path="/regional/sample-allocation"
            element={<SampleBoardAllocationRegional />}
          />
          <Route
            path="*"
            element={<h2 className="text-center text-red-600 mt-10">404 - Page Not Found</h2>}
          />
        </Routes>
      </Layout>
    </UserHierarchyProvider>
  );
}
