import { useState } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AddRetailer() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    customerUID: "", // ✅ Customer UID - First field
    ownerMobile: "",
    companyGSTN: "",
    companyName: "",
    ownerName: "",
    companyEmail: "",
    companyAddress: "",
    city: "",
    cityPIN: "",
    distributorCode: "",
    distributorName: "",
    cpmEID: "",
    cpmName: "",
    branch: user?.branch || "",
    region: user?.region || "",
  });

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const [mobileError, setMobileError] = useState("");

  // Validate mobile (10 digits) and check if exists
  const handleMobileChange = async (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, ownerMobile: cleaned });
    setMobileError("");

    // Check if 10 digits entered
    if (cleaned.length === 10) {
      try {
        const res = await fetch(`${API_BASE}/api/retailers/check/${cleaned}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.exists) {
          setMobileError("⚠️ This mobile is already registered in your database");
        }
      } catch (err) {
        console.error("Check mobile error:", err);
      }
    }
  };

  // Validate PIN (6 digits)
  const handlePINChange = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setForm({ ...form, cityPIN: cleaned });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.ownerMobile || form.ownerMobile.length !== 10) {
      return alert("❌ Please enter valid 10-digit mobile number");
    }
    if (mobileError) {
      return alert("❌ " + mobileError);
    }
    if (!form.companyName.trim()) {
      return alert("❌ Company Name is required");
    }
    if (!form.ownerName.trim()) {
      return alert("❌ Owner Name is required");
    }
    if (!form.city.trim()) {
      return alert("❌ City is required");
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        createdBy: user?.empCode,
        createdByName: user?.name,
        createdAt: new Date().toISOString(),
      };

      const res = await fetch(`${API_BASE}/api/retailers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setForm({
          customerUID: "",
          ownerMobile: "",
          companyGSTN: "",
          companyName: "",
          ownerName: "",
          companyEmail: "",
          companyAddress: "",
          city: "",
          cityPIN: "",
          distributorCode: "",
          distributorName: "",
          cpmEID: "",
          cpmName: "",
          branch: user?.branch || "",
          region: user?.region || "",
        });
        setMobileError("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert(data.message || "❌ Failed to add retailer");
      }
    } catch (err) {
      console.error("Add retailer error:", err);
      alert("❌ Error adding retailer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 25 
      }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          ➕ Add New Retailer
        </h2>
      </div>

      {success && (
        <div style={{
          background: "#d1fae5",
          color: "#065f46",
          padding: "12px 20px",
          borderRadius: 8,
          marginBottom: 20,
          fontWeight: 600,
        }}>
          ✅ Retailer added successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}>
          {/* ✅ Customer UID - First Field */}
          <FormField
            label="Customer UID (Optional - Auto-generated if empty)"
            value={form.customerUID}
            onChange={(e) => handleChange("customerUID", e.target.value.toUpperCase())}
            placeholder="e.g., RET240126ABCD"
          />

          {/* Owner Mobile */}
          <div>
            <label style={labelStyle}>Owner Mobile No. *</label>
            <input
              type="tel"
              value={form.ownerMobile}
              onChange={(e) => handleMobileChange(e.target.value)}
              placeholder="Enter 10-digit mobile"
              maxLength={10}
              required
              style={{
                ...inputStyle,
                borderColor: mobileError ? "#ef4444" : "#d1d5db",
              }}
            />
            {mobileError && (
              <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                {mobileError}
              </div>
            )}
          </div>

          {/* Company GSTN */}
          <FormField
            label="Company GSTN"
            value={form.companyGSTN}
            onChange={(e) => handleChange("companyGSTN", e.target.value.toUpperCase())}
            placeholder="Enter GSTN (15 characters)"
            maxLength={15}
          />

          {/* Company Name */}
          <FormField
            label="Company Name (As Per GST Certificate) *"
            value={form.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            placeholder="Enter company name"
            required
          />

          {/* Owner Full Name */}
          <FormField
            label="Company Owner (Full Name) *"
            value={form.ownerName}
            onChange={(e) => handleChange("ownerName", e.target.value)}
            placeholder="Enter owner full name"
            required
          />

          {/* Company Email */}
          <FormField
            label="Company Email Address"
            type="email"
            value={form.companyEmail}
            onChange={(e) => handleChange("companyEmail", e.target.value)}
            placeholder="Enter email address"
          />

          {/* Company Address */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Company Address</label>
            <textarea
              value={form.companyAddress}
              onChange={(e) => handleChange("companyAddress", e.target.value)}
              placeholder="Enter full address"
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            />
          </div>

          {/* City */}
          <FormField
            label="City *"
            value={form.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder="Enter city"
            required
          />

          {/* City PIN */}
          <FormField
            label="City PIN"
            type="tel"
            value={form.cityPIN}
            onChange={(e) => handlePINChange(e.target.value)}
            placeholder="Enter 6-digit PIN"
            maxLength={6}
          />

          {/* Distributor Code */}
          <FormField
            label="Distributor Code"
            value={form.distributorCode}
            onChange={(e) => handleChange("distributorCode", e.target.value)}
            placeholder="Enter distributor code"
          />

          {/* Distributor Name */}
          <FormField
            label="Distributor Name"
            value={form.distributorName}
            onChange={(e) => handleChange("distributorName", e.target.value)}
            placeholder="Enter distributor name"
          />

          {/* CPM EID */}
          <FormField
            label="CPM EID"
            value={form.cpmEID}
            onChange={(e) => handleChange("cpmEID", e.target.value)}
            placeholder="Enter CPM EID"
          />

          {/* CPM Name */}
          <FormField
            label="CPM Name"
            value={form.cpmName}
            onChange={(e) => handleChange("cpmName", e.target.value)}
            placeholder="Enter CPM name"
          />

          {/* Branch */}
          <FormField
            label="Branch"
            value={form.branch}
            onChange={(e) => handleChange("branch", e.target.value)}
            placeholder="Enter branch"
          />

          {/* Region */}
          <FormField
            label="Region"
            value={form.region}
            onChange={(e) => handleChange("region", e.target.value)}
            placeholder="Enter region"
          />
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: 30, display: "flex", gap: 15 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 30px",
              background: loading ? "#9ca3af" : "#22c55e",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "Adding..." : "✅ Add Retailer"}
          </button>
          
          <button
            type="button"
            onClick={() => setForm({
              customerUID: "",
              ownerMobile: "",
              companyGSTN: "",
              companyName: "",
              ownerName: "",
              companyEmail: "",
              companyAddress: "",
              city: "",
              cityPIN: "",
              distributorCode: "",
              distributorName: "",
              cpmEID: "",
              cpmName: "",
              branch: user?.branch || "",
              region: user?.region || "",
            })}
            style={{
              padding: "12px 30px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Reset Form
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============ Form Field Component ============ */
function FormField({ label, type = "text", value, onChange, placeholder, required, maxLength }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        style={inputStyle}
      />
    </div>
  );
}

/* ============ Styles ============ */
const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s ease",
  boxSizing: "border-box",
};

