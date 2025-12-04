import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";
import { useUserHierarchy } from "../context/UserHierarchyContext.jsx";
import { buildTeam } from "../helpers/buildTeam.js";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000").replace(/\/+$/, "");

export default function RegionalDailyTracker() {
  const { user, token } = useAuth();
  const { users: allUsers } = useUserHierarchy();
  const navigate = useNavigate();

  const [subordinates, setSubordinates] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (allUsers.length && user?.empCode) {
      setSubordinates(buildTeam(allUsers, user.empCode));
    }
  }, [allUsers, user]);

  async function fetchSummary(empCode) {
    const params = new URLSearchParams({ empCode });
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const res = await fetch(`${API_BASE}/api/reports/summary?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSummary(await res.json());
  }

  async function fetchReports(empCode) {
    const params = new URLSearchParams({ empCode });
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const res = await fetch(`${API_BASE}/api/reports/hierarchy?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setReports(await res.json());
  }

  const openDashboard = (emp) => {
    const role = emp.role?.toLowerCase();
    if (role === "branchmanager") navigate(`/branch-dashboard?emp=${emp.empCode}`);
    else if (role === "manager") navigate(`/manager-dashboard?emp=${emp.empCode}`);
    else navigate(`/employee-view/${emp.empCode}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📅 Regional Daily Tracker</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <div style={{ display: "flex", gap: 20 }}>
        {/* Left Panel */}
        <div style={{ flex: "1 1 250px", border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
          <h3>👥 Subordinates</h3>
          {subordinates.length === 0 ? <p>No subordinates found</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {subordinates.map(emp => (
                <li key={emp.empCode} style={{ marginBottom: 10 }}>
                  <div>{emp.name} ({emp.role})</div>
                  <button onClick={() => openDashboard(emp)}>Open Dashboard →</button>
                  <button onClick={() => { setSelectedEmp(emp.empCode); fetchSummary(emp.empCode); fetchReports(emp.empCode); }}>
                    View Reports
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Right Panel */}
        <div style={{ flex: "2 1 500px", border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
          {summary && <pre>{JSON.stringify(summary, null, 2)}</pre>}
          {reports.length > 0 && <pre>{JSON.stringify(reports, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
