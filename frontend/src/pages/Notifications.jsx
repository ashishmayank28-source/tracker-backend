import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function Notifications() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch all submitted reports for current emp
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers/my-reports?empCode=${user.empCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(filterUpcoming(data));
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Filter logic: nextMeetingDate is tomorrow & not already revisited today
  function filterUpcoming(reports) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    return reports.filter((r) => {
      const nextMeeting = r.nextMeetingDate ? new Date(r.nextMeetingDate) : null;
      if (!nextMeeting) return false;

      // Check if meeting is tomorrow
      const isTomorrow =
        nextMeeting.getDate() === tomorrow.getDate() &&
        nextMeeting.getMonth() === tomorrow.getMonth() &&
        nextMeeting.getFullYear() === tomorrow.getFullYear();

      // ✅ Check if there is a revisit today for this customerId
      const latestVisitDate = r.latestVisitDate ? new Date(r.latestVisitDate) : null;
      const revisitedToday =
        latestVisitDate &&
        latestVisitDate.getDate() === today.getDate() &&
        latestVisitDate.getMonth() === today.getMonth() &&
        latestVisitDate.getFullYear() === today.getFullYear();

      return isTomorrow && !revisitedToday;
    });
  }

  useEffect(() => {
    fetchReports();
  }, []);

  const th = { border: "1px solid #ddd", padding: "6px", background: "#f5f5f5", fontWeight: "600", fontSize: "13px" };
  const td = { border: "1px solid #ddd", padding: "6px", fontSize: "13px" };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 15 }}>🔔 Notifications</h2>
      {loading ? (
        <p>Loading…</p>
      ) : notifications.length === 0 ? (
        <p>No upcoming meetings</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Customer ID", "Name", "Company", "Discussion", "Next Meeting"].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifications.map((r, i) => (
              <tr key={i}>
                <td style={td}>{r.customerId}</td>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.company || "-"}</td>
                <td style={td}>{r.discussion || "-"}</td>
                <td style={td}>{r.nextMeetingDate ? new Date(r.nextMeetingDate).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
