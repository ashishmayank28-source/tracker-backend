import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    empCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["Employee", "Manager", "BranchManager", "RegionalManager", "Admin","Vendor"], required: true },
    passwordHash: { type: String, required: true },
    area: String,
    branch: String,
    region: String,

    // 🔹 Direct codes capture
    managerEmpCode: { type: String },
    branchManagerEmpCode: { type: String },
    regionalManagerEmpCode: { type: String },

    // 🔹 Report-to (multiple allowed)
    reportTo: [
      {
        empCode: String,
        name: String,
      },
    ],

    // 🔹 Performance Targets
    target: { type: Number, default: 0 },         // Monthly/Quarterly target
    achieved: { type: Number, default: 0 },       // Achieved amount
    dateOfLeaving: { type: String },              // DOL if employee left
    remarks: { type: String },                    // Admin remarks

    // Contact information
    email: { type: String, lowercase: true, trim: true },
    mobile: { type: String, trim: true },
    courierAddress: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
