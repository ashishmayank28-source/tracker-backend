import { useEffect, useState } from "react";
import { useAuth } from "../../auth.jsx";
import { useUserHierarchy } from "../../context/UserHierarchyContext.jsx";

export default function UsersTile() {
  const { setUsers: setContextUsers } = useUserHierarchy();
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    empCode: "",
    name: "",
    role: "Employee",
    password: "",
    area: "",
    branch: "",
    region: "",
    managerEmpCode: "",
    branchManagerEmpCode: "",
    regionalManagerEmpCode: "",
  });
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [reportUser, setReportUser] = useState(null);
  const [managerEmpCode, setManagerEmpCode] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const api = (path) => `${API_BASE}/api/admin${path}`;

  // Get users by role for dropdowns
  const managers = users.filter((u) => u.role === "Manager");
  const branchManagers = users.filter((u) => u.role === "BranchManager");
  const regionalManagers = users.filter((u) => u.role === "RegionalManager");

  // Filter users based on search
  const filteredUsers = users.filter(
    (u) =>
      u.empCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔄 Load Users
  async function loadUsers() {
    try {
      const res = await fetch(api("/users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid data");
      setUsers(data);
      setContextUsers(data);
    } catch (e) {
      setErr(e.message);
    }
  }

  // ➕ Create User
  async function createUser(e) {
    e.preventDefault();
    setErr("");
    setSuccess("");

    if (!form.empCode || !form.name || !form.password) {
      setErr("Please fill EmpCode, Name and Password");
      return;
    }

    try {
      const res = await fetch(api("/users"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setForm({
        empCode: "",
        name: "",
        role: "Employee",
        password: "",
        area: "",
        branch: "",
        region: "",
        managerEmpCode: "",
        branchManagerEmpCode: "",
        regionalManagerEmpCode: "",
      });
      setSuccess(`User ${data.empCode} created successfully!`);
      loadUsers();
    } catch (e) {
      setErr(e.message);
    }
  }

  // ❌ Remove User
  async function removeUser(empCode) {
    if (!window.confirm(`Remove user ${empCode}?`)) return;
    await fetch(api(`/users/${empCode}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadUsers();
  }

  // 🔑 Reset Password
  async function resetPassword(empCode) {
    const newPass = prompt("Enter new password:");
    if (!newPass) return;
    await fetch(api(`/users/${empCode}/reset-password`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: newPass }),
    });
    alert("Password reset!");
  }

  // 📌 Assign Report-To
  async function confirmReportTo() {
    if (!reportUser || !managerEmpCode) return;
    await fetch(api(`/users/${reportUser.empCode}/report-to`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ managerEmpCode }),
    });
    setReportUser(null);
    setManagerEmpCode("");
    loadUsers();
  }

  // ❌ Remove Report-To
  async function removeReportTo(empCode, managerEmpCode) {
    if (!window.confirm("Remove this manager from Report-To?")) return;
    await fetch(api(`/users/${empCode}/report-to/${managerEmpCode}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadUsers();
  }

  // Update role-specific fields when role changes
  function handleRoleChange(role) {
    setForm({
      ...form,
      role,
      // Reset manager fields based on role
      managerEmpCode: role === "Employee" ? form.managerEmpCode : "",
      branchManagerEmpCode: ["Employee", "Manager"].includes(role) ? form.branchManagerEmpCode : "",
      regionalManagerEmpCode: ["Employee", "Manager", "BranchManager"].includes(role) ? form.regionalManagerEmpCode : "",
    });
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div style={{ padding: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>👥 Manage Users</h3>
        <button
          onClick={loadUsers}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {err && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: 10, borderRadius: 6, marginBottom: 10 }}>
          ❌ {err}
        </div>
      )}
      {success && (
        <div style={{ background: "#dcfce7", color: "#16a34a", padding: 10, borderRadius: 6, marginBottom: 10 }}>
          ✅ {success}
        </div>
      )}

      {/* ➕ Create User Form */}
      <div style={{ background: "#f8fafc", padding: 15, borderRadius: 8, marginBottom: 20, border: "1px solid #e2e8f0" }}>
        <h4 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>➕ Create New User</h4>
        <form
          onSubmit={createUser}
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          }}
        >
          {/* Basic Info */}
          <input
            placeholder="Emp Code *"
            value={form.empCode}
            onChange={(e) => setForm({ ...form, empCode: e.target.value })}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
            required
          />
          <input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
            required
          />
          <input
            placeholder="Password *"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
            required
          />

          {/* Role Selection */}
          <select
            value={form.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db", background: "white" }}
          >
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
            <option value="BranchManager">Branch Manager</option>
            <option value="RegionalManager">Regional Manager</option>
            <option value="Admin">Admin</option>
            <option value="Vendor">Vendor</option>
          </select>

          {/* Location Info */}
          <input
            placeholder="Area"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
          />
          <input
            placeholder="Branch"
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
          />
          <input
            placeholder="Region"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
          />

          {/* Manager Selection - Only show relevant ones based on role */}
          {form.role === "Employee" && (
            <select
              value={form.managerEmpCode}
              onChange={(e) => setForm({ ...form, managerEmpCode: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db", background: "white" }}
            >
              <option value="">-- Select Manager --</option>
              {managers.map((m) => (
                <option key={m.empCode} value={m.empCode}>
                  {m.empCode} - {m.name}
                </option>
              ))}
            </select>
          )}

          {["Employee", "Manager"].includes(form.role) && (
            <select
              value={form.branchManagerEmpCode}
              onChange={(e) => setForm({ ...form, branchManagerEmpCode: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db", background: "white" }}
            >
              <option value="">-- Select Branch Manager --</option>
              {branchManagers.map((m) => (
                <option key={m.empCode} value={m.empCode}>
                  {m.empCode} - {m.name}
                </option>
              ))}
            </select>
          )}

          {["Employee", "Manager", "BranchManager"].includes(form.role) && (
            <select
              value={form.regionalManagerEmpCode}
              onChange={(e) => setForm({ ...form, regionalManagerEmpCode: e.target.value })}
              style={{ padding: 10, borderRadius: 6, border: "1px solid #d1d5db", background: "white" }}
            >
              <option value="">-- Select Regional Manager --</option>
              {regionalManagers.map((m) => (
                <option key={m.empCode} value={m.empCode}>
                  {m.empCode} - {m.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            style={{
              gridColumn: "1 / -1",
              padding: "12px",
              borderRadius: 6,
              background: "#10b981",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            ➕ Create User
          </button>
        </form>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Search users by code, name or role..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 6,
          border: "1px solid #d1d5db",
          marginBottom: 15,
        }}
      />

      {/* 📋 Users Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead style={{ background: "#f1f5f9" }}>
            <tr>
              {["EmpCode", "Name", "Role", "Branch", "Reports To", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #e2e8f0",
                    padding: "10px 8px",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, i) => (
              <tr
                key={u.empCode}
                style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
              >
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: 600, color: "#3b82f6" }}>
                  {u.empCode}
                </td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>{u.name}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      background:
                        u.role === "Admin"
                          ? "#fef3c7"
                          : u.role === "RegionalManager"
                          ? "#dbeafe"
                          : u.role === "BranchManager"
                          ? "#dcfce7"
                          : u.role === "Manager"
                          ? "#f3e8ff"
                          : "#f1f5f9",
                      color:
                        u.role === "Admin"
                          ? "#92400e"
                          : u.role === "RegionalManager"
                          ? "#1e40af"
                          : u.role === "BranchManager"
                          ? "#166534"
                          : u.role === "Manager"
                          ? "#6b21a8"
                          : "#475569",
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", color: "#64748b" }}>
                  {u.branch || "-"}
                </td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                  {u.reportTo?.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {u.reportTo.map((m) => (
                        <span
                          key={m.empCode}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "#e0f2fe",
                            color: "#0369a1",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 11,
                          }}
                        >
                          {m.name}
                          <button
                            onClick={() => removeReportTo(u.empCode, m.empCode)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 10,
                            }}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>Not Set</span>
                  )}
                </td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setReportUser(u)}
                      style={{
                        padding: "4px 8px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                      title="Add Report-To"
                    >
                      📌 Assign
                    </button>
                    <button
                      onClick={() => resetPassword(u.empCode)}
                      style={{
                        padding: "4px 8px",
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                      title="Reset Password"
                    >
                      🔑
                    </button>
                    <button
                      onClick={() => removeUser(u.empCode)}
                      style={{
                        padding: "4px 8px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                      title="Remove User"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div
        style={{
          marginTop: 15,
          padding: 10,
          background: "#f1f5f9",
          borderRadius: 6,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          fontSize: 13,
        }}
      >
        <span>Total: <b>{users.length}</b></span>
        <span>Employees: <b>{users.filter((u) => u.role === "Employee").length}</b></span>
        <span>Managers: <b>{managers.length}</b></span>
        <span>BMs: <b>{branchManagers.length}</b></span>
        <span>RMs: <b>{regionalManagers.length}</b></span>
      </div>

      {/* 📌 Report-To Popup */}
      {reportUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 12,
              width: 350,
              maxWidth: "90vw",
            }}
          >
            <h4 style={{ marginBottom: "15px", fontSize: 16 }}>
              📌 Assign Manager for <span style={{ color: "#3b82f6" }}>{reportUser.name}</span>
            </h4>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
              Current Role: <b>{reportUser.role}</b>
            </p>
            <select
              value={managerEmpCode}
              onChange={(e) => setManagerEmpCode(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 15,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            >
              <option value="">-- Select Manager/Supervisor --</option>
              {users
                .filter((u) => u.empCode !== reportUser.empCode)
                .filter((u) => ["Manager", "BranchManager", "RegionalManager", "Admin"].includes(u.role))
                .map((u) => (
                  <option key={u.empCode} value={u.empCode}>
                    {u.empCode} - {u.name} ({u.role})
                  </option>
                ))}
            </select>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setReportUser(null);
                  setManagerEmpCode("");
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  background: "#e5e7eb",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReportTo}
                disabled={!managerEmpCode}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  background: managerEmpCode ? "#3b82f6" : "#94a3b8",
                  color: "#fff",
                  border: "none",
                  cursor: managerEmpCode ? "pointer" : "not-allowed",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
