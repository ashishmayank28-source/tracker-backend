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
  const [reportUser, setReportUser] = useState(null);
  const [managerEmpCode, setManagerEmpCode] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const api = (path) => `${API_BASE}/api/admin${path}`;

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
      loadUsers();
    } catch (e) {
      setErr(e.message);
    }
  }

  // ❌ Remove User
  async function removeUser(empCode) {
    if (!window.confirm("Remove this user?")) return;
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
      {err && <p style={{ color: "red" }}>{err}</p>}

      {/* ➕ Create User Form */}
      <form
        onSubmit={createUser}
        style={{
          marginBottom: 20,
          display: "grid",
          gap: "8px",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        }}
      >
        {[
          { placeholder: "EmpCode", key: "empCode" },
          { placeholder: "Password", key: "password", type: "password" },
          { placeholder: "Name", key: "name" },
          { placeholder: "Area", key: "area" },
          { placeholder: "Branch", key: "branch" },
          { placeholder: "Region", key: "region" },
          { placeholder: "Manager EmpCode", key: "managerEmpCode" },
          { placeholder: "Branch Manager EmpCode", key: "branchManagerEmpCode" },
          { placeholder: "Regional Manager EmpCode", key: "regionalManagerEmpCode" },
        ].map((field) => (
          <input
            key={field.key}
            placeholder={field.placeholder}
            type={field.type || "text"}
            value={form[field.key]}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            style={{
              padding: "6px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        ))}

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          style={{
            padding: "6px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        >
          <option value="Employee">Employee</option>
          <option value="Manager">Manager</option>
          <option value="BranchManager">Branch Manager</option>
          <option value="RegionalManager">Regional Manager</option>
          <option value="Admin">Admin</option>
          <option value="Vendor">Vendor</option>
        </select>

        <button
          type="submit"
          style={{
            gridColumn: "1 / -1",
            padding: "8px 12px",
            borderRadius: "4px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          ➕ Create User
        </button>
      </form>

      {/* 📋 Users Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            marginBottom: "20px",
          }}
        >
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              {["EmpCode", "Name", "Role", "Report To", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.empCode}
                style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
              >
                <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.empCode}</td>
                <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.name}</td>
                <td style={{ border: "1px solid #ddd", padding: "6px" }}>{u.role}</td>
                <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                  {u.reportTo?.length
                    ? u.reportTo.map((m) => `${m.empCode} - ${m.name}`).join(", ")
                    : "Not Set"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                  <button
                    onClick={() => removeUser(u.empCode)}
                    style={{
                      marginRight: "5px",
                      padding: "4px 8px",
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    ❌ Remove
                  </button>
                  <button
                    onClick={() => resetPassword(u.empCode)}
                    style={{
                      marginRight: "5px",
                      padding: "4px 8px",
                      background: "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    🔑 Reset
                  </button>
                  <button
                    onClick={() => setReportUser(u)}
                    style={{
                      padding: "4px 8px",
                      background: "#1976d2",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    📌 Add Report-To
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              width: 300,
            }}
          >
            <h4 style={{ marginBottom: "10px" }}>
              Add Report-To for {reportUser.name}
            </h4>
            <select
              value={managerEmpCode}
              onChange={(e) => setManagerEmpCode(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 10,
                padding: "6px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">-- Select Manager --</option>
              {users
                .filter((u) => u.empCode !== reportUser.empCode)
                .map((u) => (
                  <option key={u.empCode} value={u.empCode}>
                    {u.empCode} - {u.name}
                  </option>
                ))}
            </select>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setReportUser(null)}
                style={{
                  marginRight: "10px",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  background: "#ccc",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReportTo}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  background: "#1976d2",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
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
