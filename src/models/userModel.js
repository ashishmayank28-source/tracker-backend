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

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
