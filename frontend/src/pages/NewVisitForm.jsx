import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import imageCompression from "browser-image-compression";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function VisitForm() {
  const { user, token } = useAuth();
  const [itemNames, setItemNames] = useState([]);
  const [channelPartners, setChannelPartners] = useState([]);

  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    vertical: "",
    empCode: user?.empCode || "",
    meetingType: "",
    callType: "",
    customerType: "",
    name: "",
    mobile: "",
    company: "",
    designation: "",
    discussion: "",
    opportunityType: "",
    orderStatus: "Pending",
    orderValue: "",
    orderLossReason: "",
    nextMeetingDate: "",
    expectedOrderDate: "",
    attendees: "",
    purpose: "",
  });

  // 🔹 Revenue (Order Won)
  const [revForm, setRevForm] = useState({
    distributorName: "",
    distributorCode: "",
    orderType: "Project",
    itemName: "",
    orderValue: "",
    poNumber: "",
    poFile: null,
  });

  const input = {
    width: "100%",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    marginBottom: "12px",
  };
  const label = { display: "block", fontWeight: "600", marginBottom: "6px" };
  const button = {
    padding: "10px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/item-names`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setItemNames(Array.isArray(data) ? data : []))
      .catch(() => setItemNames([]));
  }, [token]);

  const handleChange = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/channel-partners`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setChannelPartners(Array.isArray(data) ? data : []))
      .catch(() => setChannelPartners([]));
  }, [token]);

  const handleRevChange = (e) => {
    const { name, value } = e.target;

    if (name === "distributorCode") {
      const match = channelPartners.find((p) => p.distributorCode === value);
      return setRevForm((p) => ({
        ...p,
        distributorCode: value,
        distributorName: match ? match.distributorName : "",
      }));
    }

    setRevForm((p) => ({ ...p, [name]: value }));
  };

  // 🔹 Compress + set PO file
  const handlePOFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
      setRevForm((p) => ({ ...p, poFile: compressed }));
    } else {
      setRevForm((p) => ({ ...p, poFile: file }));
    }
  };

  // 🔹 Unified Submit
  const handleSubmit = async () => {
    try {
      // 🧩 Prepare full data (merge visit + revenue)
      const fd = new FormData();
Object.entries({ ...form, ...revForm }).forEach(([k, v]) => {
  if (v !== null && v !== undefined) fd.append(k, v);
});
fd.append("empCode", user.empCode);

const res = await fetch(`${API_BASE}/api/customers/new`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: fd,
});

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save visit");

      // 🆕 upload PO file if exists
      if (revForm.poFile) {
        const fd = new FormData();
        Object.entries(revForm).forEach(([k, v]) => fd.append(k, v));
        fd.append("empCode", user.empCode);
        await fetch(`${API_BASE}/api/revenue/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      setMsg("✅ Visit saved successfully");
      setStep(1);
      setForm({
        vertical: "",
        empCode: user?.empCode || "",
        meetingType: "",
        callType: "",
        customerType: "",
        name: "",
        mobile: "",
        company: "",
        designation: "",
        discussion: "",
        opportunityType: "",
        orderStatus: "Pending",
        orderValue: "",
        orderLossReason: "",
        nextMeetingDate: "",
        expectedOrderDate: "",
        attendees: "",
        purpose: "",
      });
      setRevForm({
        distributorName: "",
        distributorCode: "",
        orderType: "Project",
        itemName: "",
        orderValue: "",
        poNumber: "",
        poFile: null,
      });
    } catch (err) {
      console.error(err);
      setMsg("❌ Error saving visit");
    }
  };

  /* ---------- UI ---------- */
  return (
    <div
      style={{
        maxWidth: "650px",
        margin: "0 auto",
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        📝 Daily Sales Register
      </h2>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <label style={label}>Vertical *</label>
          <select
            style={input}
            value={form.vertical}
            onChange={(e) => handleChange("vertical", e.target.value)}
          >
            <option value="">-- Select Vertical --</option>
            <option value="EP">EP</option>
            <option value="GFD">GFD</option>
            <option value="Leave">Leave</option>
          </select>
          <button 
            style={button} 
            onClick={() => {
              // If Leave selected, go directly to Leave form (step 10)
              if (form.vertical === "Leave") {
                setStep(10);
              } else {
                setStep(2);
              }
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <label style={label}>Employee Code *</label>
          <input
            style={input}
            value={form.empCode}
            onChange={(e) => handleChange("empCode", e.target.value)}
          />
          <button style={button} onClick={() => setStep(3)}>
            Next
          </button>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <label style={label}>Meeting Type *</label>
          <select
            style={input}
            value={form.meetingType}
            onChange={(e) => handleChange("meetingType", e.target.value)}
          >
            <option value="">-- Select --</option>
            <option value="Internal">Internal</option>
            <option value="External">External</option>
          </select>
          <button style={button} onClick={() => setStep(4)}>
            Next
          </button>
        </div>
      )}

      {/* Internal */}
      {form.meetingType === "Internal" && step === 4 && (
        <div>
          <label style={label}>Attendees *</label>
          <input
            value={form.attendees}
            onChange={(e) => handleChange("attendees", e.target.value)}
            style={input}
          />
          <label style={label}>Purpose *</label>
          <textarea
            value={form.purpose}
            onChange={(e) => handleChange("purpose", e.target.value)}
            style={{ ...input, minHeight: 80 }}
          />
          <button style={button} onClick={handleSubmit}>
            Submit
          </button>
        </div>
      )}

      {/* External */}
      {step === 4 && form.meetingType === "External" && (
        <div>
          <label style={label}>Call Type *</label>
          <select
            style={input}
            value={form.callType}
            onChange={(e) => handleChange("callType", e.target.value)}
          >
            <option value="FaceToFace">Face To Face</option>
            <option value="Telephonic">Telephonic</option>
          </select>
          <label style={label}>Customer Type *</label>
          <select
            style={input}
            value={form.customerType}
            onChange={(e) => handleChange("customerType", e.target.value)}
          >
            <option value="">-- Select --</option>
            <option value="Retailer">Retailer</option>
            <option value="Distributor">Distributor</option>
            <option value="Architect">Architect/Interior Designer</option>
            <option value="Electrician">Electrician</option>
            <option value="EndUser">End User / Developer / Builder</option>
          </select>
          <button style={button} onClick={() => setStep(5)}>
            Next
          </button>
        </div>
      )}

      {/* Step 5 */}
      {step === 5 && (
        <CustomerForm
          form={form}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          input={input}
          label={label}
          button={button}
          handleRevChange={handleRevChange}
          handlePOFile={handlePOFile}
          revForm={revForm}
          itemNames={itemNames}
          channelPartners={channelPartners}
        />
      )}

      {/* Step 10: Leave Form */}
      {step === 10 && (
        <div>
          <div
            style={{
              background: "#dbeafe",
              border: "1px solid #93c5fd",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", color: "#1e40af" }}>
              🏖️ Leave Application
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#3b82f6" }}>
              Submit your leave request. This will mark "L" (Leave) in your attendance.
            </p>
          </div>

          <label style={label}>Reason for Leave *</label>
          <textarea
            style={{ ...input, minHeight: 100 }}
            placeholder="Enter reason for leave (e.g., Sick Leave, Personal Work, etc.)"
            value={form.discussion}
            onChange={(e) => handleChange("discussion", e.target.value)}
          />

          <button
            style={button}
            onClick={async () => {
              if (!form.discussion?.trim()) {
                setMsg("❌ Please enter reason for leave");
                return;
              }
              try {
                const leavePayload = {
                  empCode: user.empCode,
                  vertical: "Leave",
                  meetingType: "Leave",
                  customerType: "Leave",
                  name: "Leave Application",
                  mobile: "NA",
                  company: "NA",
                  designation: "NA",
                  discussion: form.discussion,
                  attendees: user.name || user.empCode,
                  purpose: form.discussion,
                };

                const res = await fetch(`${API_BASE}/api/customers/new`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(leavePayload),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to submit leave");

                setMsg("✅ Leave submitted successfully! Your attendance will show 'L' for today.");
                setStep(1);
                setForm({
                  vertical: "",
                  empCode: user?.empCode || "",
                  meetingType: "",
                  callType: "",
                  customerType: "",
                  name: "",
                  mobile: "",
                  company: "",
                  designation: "",
                  discussion: "",
                  opportunityType: "",
                  orderStatus: "Pending",
                  orderValue: "",
                  orderLossReason: "",
                  nextMeetingDate: "",
                  expectedOrderDate: "",
                  attendees: "",
                  purpose: "",
                });
              } catch (err) {
                console.error(err);
                setMsg("❌ Error submitting leave: " + err.message);
              }
            }}
          >
            Submit Leave
          </button>

          <button
            style={{
              ...button,
              background: "#6b7280",
              marginLeft: "10px",
            }}
            onClick={() => setStep(1)}
          >
            ← Back
          </button>
        </div>
      )}

      {msg && (
        <p
          style={{
            marginTop: 10,
            fontWeight: 600,
            color: msg.includes("✅") ? "green" : "red",
          }}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

/* ---------- Customer Form ---------- */
function CustomerForm({
  form,
  handleChange,
  handleSubmit,
  input,
  label,
  button,
  handleRevChange,
  handlePOFile,
  revForm,
  itemNames = [],
  channelPartners = [],
}) {
  // ✅ Mobile validation - only allow digits and max 10 characters
  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    if (value.length <= 10) {
      handleChange("mobile", value);
    }
  };

  return (
    <div>
      <label style={label}>Mobile * (10 digits only)</label>
      <input
        style={input}
        type="tel"
        maxLength={10}
        placeholder="Enter 10 digit mobile number"
        value={form.mobile}
        onChange={handleMobileChange}
      />
      {form.mobile && form.mobile.length < 10 && (
        <p style={{ color: "#f59e0b", fontSize: 12, margin: "-8px 0 8px 0" }}>
          ⚠️ Please enter 10 digit mobile number ({form.mobile.length}/10)
        </p>
      )}

      <label style={label}>Company *</label>
      <input
        style={input}
        value={form.company}
        onChange={(e) => handleChange("company", e.target.value)}
      />

      <label style={label}>Contact Person *</label>
      <input
        style={input}
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />

      <label style={label}>Designation *</label>
      <input
        style={input}
        value={form.designation}
        onChange={(e) => handleChange("designation", e.target.value)}
      />

      <label style={label}>Discussion *</label>
      <textarea
        style={input}
        value={form.discussion}
        onChange={(e) => handleChange("discussion", e.target.value)}
      />

      <label style={label}>Opportunity Type *</label>
      <select
        style={input}
        value={form.opportunityType}
        onChange={(e) => handleChange("opportunityType", e.target.value)}
      >
        <option value="">-- Select --</option>
        <option value="Flat">Flat</option>
        <option value="Villa">Villa</option>
        <option value="Shop">Shop</option>
        <option value="Office">Office</option>
        <option value="Hotel">Hotel</option>
        <option value="Hospital">Hospital</option>
        <option value="Others">Others</option>
      </select>

      <label style={label}>Order Status *</label>
      <select
        style={input}
        value={form.orderStatus}
        onChange={(e) => handleChange("orderStatus", e.target.value)}
      >
        <option value="Pending">Pending</option>
        <option value="Won">Won</option>
        <option value="Lost">Lost</option>
      </select>

      {/* Pending */}
      {form.orderStatus === "Pending" && (
        <>
          <label style={label}>Next Meeting Date</label>
          <input
            type="date"
            style={input}
            value={form.nextMeetingDate}
            onChange={(e) => handleChange("nextMeetingDate", e.target.value)}
          />
          <label style={label}>Expected Order Date</label>
          <input
            type="date"
            style={input}
            value={form.expectedOrderDate}
            onChange={(e) => handleChange("expectedOrderDate", e.target.value)}
          />
          <button style={button} onClick={handleSubmit}>
            Submit
          </button>
        </>
      )}

      {/* Lost */}
      {form.orderStatus === "Lost" && (
        <div>
          <label style={label}>Reason for Loss *</label>
          <input
            style={input}
            value={form.orderLossReason}
            onChange={(e) => handleChange("orderLossReason", e.target.value)}
          />
          <button style={button} onClick={handleSubmit}>
            Submit
          </button>
        </div>
      )}

      {/* Won */}
      {form.orderStatus === "Won" && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            marginTop: 16,
          }}
        >
          <h4>💰 Order Won Details</h4>
          <input
            name="distributorCode"
            placeholder="Distributor Code"
            style={input}
            value={revForm.distributorCode}
            onChange={handleRevChange}
            list="channel-partner-codes"
            required
          />
          <datalist id="channel-partner-codes">
            {channelPartners.map((p) => (
              <option key={p._id || p.distributorCode} value={p.distributorCode}>
                {p.distributorCode}
              </option>
            ))}
          </datalist>

          <input
            name="distributorName"
            placeholder="Distributor Name"
            style={input}
            value={revForm.distributorName}
            readOnly
            required
          />
          <select
            name="orderType"
            style={input}
            value={revForm.orderType}
            onChange={handleRevChange}
          >
            <option value="Project">Project</option>
            <option value="Retail">Retail</option>
          </select>
          <label style={label}>Item Name *</label>
          <select
            name="itemName"
            style={input}
            value={revForm.itemName}
            onChange={handleRevChange}
            required
          >
            <option value="">-- Select Item --</option>
            {itemNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {itemNames.length === 0 && (
            <p style={{ color: "#f59e0b", fontSize: 12, margin: "-8px 0 8px 0" }}>
              No items in list. Please ask admin to add item names.
            </p>
          )}
          <input
            type="number"
            name="orderValue"
            placeholder="Value (₹)"
            style={input}
            onChange={handleRevChange}
            required
          />
          <input
            name="poNumber"
            placeholder="PO No."
            style={input}
            onChange={handleRevChange}
            required
          />
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            Upload PO
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handlePOFile}
            style={input}
            required
          />
          <button style={button} onClick={handleSubmit}>
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
