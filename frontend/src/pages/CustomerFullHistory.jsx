import { useLocation, useParams, useNavigate } from "react-router-dom";

export default function CustomerFullHistory() {
  const { state } = useLocation();
  const { customerId } = useParams();
  const navigate = useNavigate();
  const history = state?.history || [];

  if (!history.length) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>📜 Customer Full History</h2>
        <p>No history available for Customer ID: {customerId}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: "10px",
            background: "#2563eb",
            color: "#fff",
            padding: "6px 12px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>📜 Full History for Customer ID: {customerId}</h2>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "15px",
          background: "#2563eb",
          color: "#fff",
          padding: "6px 12px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        ← Back
      </button>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f5f5f5" }}>
            {[
              "Customer ID","Name","Mobile","Company","Designation","Meeting Type","Customer Type",
              "Discussion","Order Status","Order Value","Loss Reason","Next Meeting",
              "Expected Order","Attendees","Purpose","Date"
            ].map((h) => (
              <th key={h} style={{ border: "1px solid #ddd", padding: "6px", fontSize: "13px" }}>{h}</th>
            ))}
          </thead>
          <tbody>
            {history.map((r, i) => (
              <tr key={i}>
                <td style={td}>{r.customerId}</td>
                <td style={td}>{r.customer}</td>
                <td style={td}>{r.mobile}</td>
                <td style={td}>{r.company}</td>
                <td style={td}>{r.designation}</td>
                <td style={td}>{r.meetingType}</td>
                <td style={td}>{r.customerType}</td>
                <td style={td}>{r.discussion}</td>
                <td style={td}>{r.orderStatus}</td>
                <td style={td}>{r.orderValue || "-"}</td>
                <td style={td}>{r.lossReason || "-"}</td>
                <td style={td}>{r.nextMeeting ? new Date(r.nextMeeting).toLocaleDateString() : "-"}</td>
                <td style={td}>{r.expectedOrderDate ? new Date(r.expectedOrderDate).toLocaleDateString() : "-"}</td>
                <td style={td}>{r.attendees || "-"}</td>
                <td style={td}>{r.purpose || "-"}</td>
                <td style={td}>{r.date ? new Date(r.date).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const td = { border: "1px solid #ddd", padding: "6px", fontSize: "13px" };
