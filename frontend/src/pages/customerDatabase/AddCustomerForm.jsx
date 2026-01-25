import { useState } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

// ✅ Common Add Customer Form - Works for all customer types
export default function AddCustomerForm({ customerType, onSuccess, onBack }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mobileError, setMobileError] = useState("");

  const [form, setForm] = useState({
    customerUID: "",
    mobile: "",
    name: "",
    companyName: "",
    email: "",
    address: "",
    city: "",
    pinCode: "",
    // Retailer fields
    gstn: "",
    distributorCode: "",
    distributorName: "",
    cpmEID: "",
    cpmName: "",
    // Electrician fields
    specialization: "",
    experience: "",
    licenseNumber: "",
    // Architect/Interior Designer fields
    firmName: "",
    registrationNumber: "",
    projectTypes: "",
    // Builder/Developer fields
    companyType: "",
    reraNumber: "",
    ongoingProjects: "",
    // Common
    branch: user?.branch || "",
    region: user?.region || "",
    remarks: "",
  });

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  // Validate mobile and check if exists
  const handleMobileChange = async (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, mobile: cleaned });
    setMobileError("");

    if (cleaned.length === 10) {
      try {
        const res = await fetch(`${API_BASE}/api/customer-database/check/${cleaned}/${customerType}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.exists) {
          setMobileError(`⚠️ This mobile is already registered as ${customerType}`);
        }
      } catch (err) {
        console.error("Check mobile error:", err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.mobile || form.mobile.length !== 10) {
      return alert("❌ Please enter valid 10-digit mobile number");
    }
    if (mobileError) {
      return alert("❌ " + mobileError);
    }
    if (!form.name.trim()) {
      return alert("❌ Name is required");
    }
    if (!form.city.trim()) {
      return alert("❌ City is required");
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        customerType,
      };

      const res = await fetch(`${API_BASE}/api/customer-database`, {
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
        // Reset form
        setForm({
          customerUID: "",
          mobile: "",
          name: "",
          companyName: "",
          email: "",
          address: "",
          city: "",
          pinCode: "",
          gstn: "",
          distributorCode: "",
          distributorName: "",
          cpmEID: "",
          cpmName: "",
          specialization: "",
          experience: "",
          licenseNumber: "",
          firmName: "",
          registrationNumber: "",
          projectTypes: "",
          companyType: "",
          reraNumber: "",
          ongoingProjects: "",
          branch: user?.branch || "",
          region: user?.region || "",
          remarks: "",
        });
        setMobileError("");
        setTimeout(() => setSuccess(false), 3000);
        if (onSuccess) onSuccess(data.data);
      } else {
        alert(data.message || "❌ Failed to add customer");
      }
    } catch (err) {
      console.error("Add customer error:", err);
      alert("❌ Error adding customer");
    } finally {
      setLoading(false);
    }
  };

  // Get type-specific icon
  const getIcon = () => {
    const icons = {
      "Retailer": "🏪",
      "Electrician": "⚡",
      "Architect": "🏛️",
      "Interior Designer": "🎨",
      "Builder": "🏗️",
      "Developer": "🏢",
    };
    return icons[customerType] || "👤";
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {getIcon()} Add New {customerType}
        </h2>
        {onBack && (
          <button onClick={onBack} style={backBtnStyle}>
            ← Back
          </button>
        )}
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
          ✅ {customerType} added successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}>
          {/* 🔹 Customer UID - First Field */}
          <FormField
            label="Customer UID (Optional - Auto-generated if empty)"
            value={form.customerUID}
            onChange={(e) => handleChange("customerUID", e.target.value.toUpperCase())}
            placeholder="e.g., RET240126ABCD"
          />

          {/* Mobile */}
          <div>
            <label style={labelStyle}>Mobile No. *</label>
            <input
              type="tel"
              value={form.mobile}
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

          {/* Name */}
          <FormField
            label="Name *"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter full name"
            required
          />

          {/* Company/Firm Name */}
          <FormField
            label={customerType === "Architect" || customerType === "Interior Designer" ? "Firm Name" : "Company Name"}
            value={customerType === "Architect" || customerType === "Interior Designer" ? form.firmName : form.companyName}
            onChange={(e) => handleChange(
              customerType === "Architect" || customerType === "Interior Designer" ? "firmName" : "companyName",
              e.target.value
            )}
            placeholder={`Enter ${customerType === "Architect" || customerType === "Interior Designer" ? "firm" : "company"} name`}
          />

          {/* Email */}
          <FormField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="Enter email address"
          />

          {/* Address */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Address</label>
            <textarea
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
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

          {/* PIN Code */}
          <FormField
            label="PIN Code"
            type="tel"
            value={form.pinCode}
            onChange={(e) => handleChange("pinCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit PIN"
            maxLength={6}
          />

          {/* ========== RETAILER SPECIFIC FIELDS ========== */}
          {customerType === "Retailer" && (
            <>
              <FormField
                label="GSTN"
                value={form.gstn}
                onChange={(e) => handleChange("gstn", e.target.value.toUpperCase())}
                placeholder="Enter GSTN (15 characters)"
                maxLength={15}
              />
              <FormField
                label="Distributor Code"
                value={form.distributorCode}
                onChange={(e) => handleChange("distributorCode", e.target.value)}
                placeholder="Enter distributor code"
              />
              <FormField
                label="Distributor Name"
                value={form.distributorName}
                onChange={(e) => handleChange("distributorName", e.target.value)}
                placeholder="Enter distributor name"
              />
              <FormField
                label="CPM EID"
                value={form.cpmEID}
                onChange={(e) => handleChange("cpmEID", e.target.value)}
                placeholder="Enter CPM EID"
              />
              <FormField
                label="CPM Name"
                value={form.cpmName}
                onChange={(e) => handleChange("cpmName", e.target.value)}
                placeholder="Enter CPM name"
              />
            </>
          )}

          {/* ========== ELECTRICIAN SPECIFIC FIELDS ========== */}
          {customerType === "Electrician" && (
            <>
              <div>
                <label style={labelStyle}>Specialization</label>
                <select
                  value={form.specialization}
                  onChange={(e) => handleChange("specialization", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Select --</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="All">All</option>
                </select>
              </div>
              <FormField
                label="Experience (Years)"
                value={form.experience}
                onChange={(e) => handleChange("experience", e.target.value)}
                placeholder="Enter years of experience"
              />
              <FormField
                label="License Number"
                value={form.licenseNumber}
                onChange={(e) => handleChange("licenseNumber", e.target.value)}
                placeholder="Enter license number"
              />
            </>
          )}

          {/* ========== ARCHITECT / INTERIOR DESIGNER SPECIFIC FIELDS ========== */}
          {(customerType === "Architect" || customerType === "Interior Designer") && (
            <>
              <FormField
                label="Registration Number"
                value={form.registrationNumber}
                onChange={(e) => handleChange("registrationNumber", e.target.value)}
                placeholder="Enter registration number"
              />
              <div>
                <label style={labelStyle}>Project Types</label>
                <select
                  value={form.projectTypes}
                  onChange={(e) => handleChange("projectTypes", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Select --</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Both">Both</option>
                </select>
              </div>
            </>
          )}

          {/* ========== BUILDER / DEVELOPER SPECIFIC FIELDS ========== */}
          {(customerType === "Builder" || customerType === "Developer") && (
            <>
              <div>
                <label style={labelStyle}>Company Type</label>
                <select
                  value={form.companyType}
                  onChange={(e) => handleChange("companyType", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Select --</option>
                  <option value="Builder">Builder</option>
                  <option value="Developer">Developer</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <FormField
                label="RERA Number"
                value={form.reraNumber}
                onChange={(e) => handleChange("reraNumber", e.target.value)}
                placeholder="Enter RERA registration number"
              />
              <FormField
                label="Ongoing Projects"
                value={form.ongoingProjects}
                onChange={(e) => handleChange("ongoingProjects", e.target.value)}
                placeholder="Enter ongoing project details"
              />
            </>
          )}

          {/* Branch & Region */}
          <FormField
            label="Branch"
            value={form.branch}
            onChange={(e) => handleChange("branch", e.target.value)}
            placeholder="Enter branch"
          />
          <FormField
            label="Region"
            value={form.region}
            onChange={(e) => handleChange("region", e.target.value)}
            placeholder="Enter region"
          />

          {/* Remarks */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              placeholder="Any additional notes..."
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            />
          </div>
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
            }}
          >
            {loading ? "Adding..." : `✅ Add ${customerType}`}
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
  boxSizing: "border-box",
};

const backBtnStyle = {
  padding: "8px 16px",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
};
