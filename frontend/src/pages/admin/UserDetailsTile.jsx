import { useEffect, useState } from "react";
import { useAuth } from "../../auth.jsx";

export default function UserDetailsTile() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [err, setErr] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // Get unique branches for filter
  const branches = [...new Set(users.map((u) => u.branch).filter(Boolean))].sort();
  const roles = [...new Set(users.map((u) => u.role).filter(Boolean))].sort();

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid data");
      setUsers(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.empCode?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile?.includes(search);

    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesBranch = !branchFilter || u.branch === branchFilter;

    return matchesSearch && matchesRole && matchesBranch;
  });

  // Get role display name
  const getRoleDisplay = (role) => {
    const roleMap = {
      Employee: "Sales Executive",
      Manager: "Area Manager",
      BranchManager: "Branch Manager",
      RegionalManager: "Regional Manager",
      Admin: "Administrator",
      Vendor: "Vendor Partner",
    };
    return roleMap[role] || role;
  };

  // Export to CSV
  function exportToCSV() {
    const headers = [
      "Emp Code",
      "Name",
      "Password", // ⚠️ Added for admin reference
      "Designation",
      "Role",
      "Email",
      "Mobile 1",
      "Mobile 2",
      "Area",
      "Branch",
      "Region",
      "Courier Address",
      "Status",
    ];

    const rows = filteredUsers.map((u) => [
      u.empCode || "",
      u.name || "",
      u.plainPassword || "", // ⚠️ Added for admin reference
      u.designation || "",
      getRoleDisplay(u.role),
      u.email || "",
      u.mobile || "",
      u.mobile2 || "",
      u.area || "",
      u.branch || "",
      u.region || "",
      (u.courierAddress || "").replace(/,/g, ";"),
      u.isActive !== false ? "Active" : "Inactive",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-details-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 15,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px" }}>📋 User Details</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
          <button
            onClick={exportToCSV}
            style={{
              padding: "8px 16px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {err && <p style={{ color: "red", marginBottom: 10 }}>{err}</p>}

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 15,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search by name, code, email, mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 6,
            minWidth: 250,
            flex: 1,
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {getRoleDisplay(r)}
            </option>
          ))}
        </select>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <span style={{ color: "#666", fontSize: 14 }}>
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Users Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
            minWidth: 1200,
          }}
        >
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              {[
                "Emp Code",
                "Name",
                "🔑 Password", // ⚠️ For admin reference
                "Designation",
                "Role",
                "Email",
                "Mobile 1",
                "Mobile 2",
                "Area",
                "Branch",
                "Region",
                "Courier Address",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #e2e8f0",
                    padding: "10px 8px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#475569",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  style={{
                    textAlign: "center",
                    padding: 30,
                    color: "#94a3b8",
                  }}
                >
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, i) => (
                <tr
                  key={u.empCode}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc")}
                >
                  <td
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: "8px",
                      fontWeight: 600,
                      color: "#3b82f6",
                    }}
                  >
                    {u.empCode}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: 500 }}>
                    {u.name || "-"}
                  </td>
                  {/* 🔑 Password Column - For Admin Reference */}
                  <td style={{ 
                    border: "1px solid #e2e8f0", 
                    padding: "8px", 
                    color: "#dc2626",
                    fontFamily: "monospace",
                    fontSize: 12,
                    background: "#fef2f2",
                  }}>
                    {u.plainPassword || "••••••"}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", color: "#64748b" }}>
                    {u.designation || "-"}
                  </td>
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
                            : u.role === "Vendor"
                            ? "#ffe4e6"
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
                            : u.role === "Vendor"
                            ? "#be123c"
                            : "#475569",
                      }}
                    >
                      {getRoleDisplay(u.role)}
                    </span>
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", color: "#64748b" }}>
                    {u.email || "-"}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    {u.mobile ? (
                      <a href={`tel:${u.mobile}`} style={{ color: "#3b82f6", textDecoration: "none" }}>
                        {u.mobile}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    {u.mobile2 ? (
                      <a href={`tel:${u.mobile2}`} style={{ color: "#3b82f6", textDecoration: "none" }}>
                        {u.mobile2}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", color: "#64748b" }}>
                    {u.area || "-"}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", color: "#64748b" }}>
                    {u.branch || "-"}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", color: "#64748b" }}>
                    {u.region || "-"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: "8px",
                      color: "#64748b",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={u.courierAddress || ""}
                  >
                    {u.courierAddress || "-"}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        background: u.isActive !== false ? "#dcfce7" : "#fee2e2",
                        color: u.isActive !== false ? "#166534" : "#dc2626",
                      }}
                    >
                      {u.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div
        style={{
          marginTop: 15,
          padding: 15,
          background: "#f8fafc",
          borderRadius: 8,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ color: "#64748b", fontSize: 12 }}>Total Users</span>
          <p style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>{users.length}</p>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 12 }}>Active</span>
          <p style={{ fontWeight: 600, fontSize: 18, margin: 0, color: "#16a34a" }}>
            {users.filter((u) => u.isActive !== false).length}
          </p>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 12 }}>With Email</span>
          <p style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>{users.filter((u) => u.email).length}</p>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 12 }}>With Mobile</span>
          <p style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>{users.filter((u) => u.mobile).length}</p>
        </div>
      </div>
    </div>
  );
}

