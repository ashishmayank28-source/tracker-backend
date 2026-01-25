import mongoose from "mongoose";

// ✅ Common Customer Schema for all customer types
const customerSchema = new mongoose.Schema(
  {
    // 🔹 Customer UID - Unique identifier (auto-generated or user-entered)
    customerUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // 🔹 Customer Type
    customerType: {
      type: String,
      enum: ["Retailer", "Electrician", "Architect", "Interior Designer", "Builder", "Developer"],
      required: true,
      index: true,
    },
    
    // 🔹 Common Fields
    mobile: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    companyName: String,
    email: String,
    address: String,
    city: {
      type: String,
      required: true,
    },
    pinCode: String,
    
    // 🔹 Retailer-specific fields
    gstn: {
      type: String,
      uppercase: true,
    },
    distributorCode: String,
    distributorName: String,
    cpmEID: String,
    cpmName: String,
    
    // 🔹 Electrician-specific fields
    specialization: String,  // e.g., "Residential", "Commercial", "Industrial"
    experience: String,      // Years of experience
    licenseNumber: String,
    
    // 🔹 Architect/Interior Designer-specific fields
    firmName: String,
    registrationNumber: String,
    projectTypes: String,    // e.g., "Residential", "Commercial", "Both"
    
    // 🔹 Builder/Developer-specific fields
    companyType: String,     // e.g., "Builder", "Developer", "Both"
    reraNumber: String,
    ongoingProjects: String,
    
    // 🔹 Metadata
    branch: String,
    region: String,
    createdBy: {
      type: String,
      required: true,
    },
    createdByName: String,
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    remarks: String,
  },
  { timestamps: true }
);

// Index for faster searches
customerSchema.index({ companyName: "text", name: "text", city: "text" });

// ✅ Auto-generate Customer UID before save if not provided
customerSchema.pre("save", async function (next) {
  if (!this.customerUID) {
    // Generate UID: TYPE_PREFIX + YYMMDD + RANDOM
    const prefix = {
      "Retailer": "RET",
      "Electrician": "ELC",
      "Architect": "ARC",
      "Interior Designer": "INT",
      "Builder": "BLD",
      "Developer": "DEV",
    }[this.customerType] || "CUS";
    
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    this.customerUID = `${prefix}${dateStr}${random}`;
  }
  next();
});

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
