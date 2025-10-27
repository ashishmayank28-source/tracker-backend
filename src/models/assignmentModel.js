import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  empCode: String,
  name: String,
  qty: Number,
  extra: Object,
});

const assignmentSchema = new mongoose.Schema({
  /* 🔹 Hierarchy Chain */
  rootId: { type: String, required: true },   // Admin level ID (always present)
  rmId: { type: String, default: "" },        // Regional Manager ID
  bmId: { type: String, default: "" },        // Branch Manager ID
  managerId: { type: String, default: "" },   // Manager ID (optional, next level)

  /* 🔹 Assignment Details */
  item: { type: String, required: true },
  employees: [employeeSchema],
  purpose: { type: String, default: "" },
  assignedBy: { type: String, default: "" },
  role: { type: String, default: "" },
  region: { type: String, default: "" },
  branch: { type: String, default: "" },
  date: { type: String, default: () => new Date().toLocaleString() },

  /* 🔹 Vendor/Dispatch Controls */
  toVendor: { type: Boolean, default: false },
  lrNo: { type: String, default: "" },                 // Vendor LR no
  lrUpdatedBy: { type: String, default: "" },          // Who updated LR
  lrUpdatedAt: { type: String, default: "" },          // Timestamp for LR update

  /* 🔹 Audit Info */
  createdAt: { type: Date, default: Date.now },
  /* 🔹 Tracking fields */
  toVendor: { type: Boolean, default: false },
  lrNo: { type: String, default: "" },
});


export default mongoose.model("Assignment", assignmentSchema);
