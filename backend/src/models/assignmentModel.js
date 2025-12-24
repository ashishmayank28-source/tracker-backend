import mongoose from "mongoose";

// ✅ Used Sample tracking schema (for employee to link customer)
const usedSampleSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  qty: { type: Number, default: 1 },
  usedBy: { type: String },       // empCode who used
  usedAt: { type: Date, default: Date.now },
});

const employeeSchema = new mongoose.Schema({
  empCode: String,
  name: String,
  qty: Number,
  usedQty: { type: Number, default: 0 },  // ✅ Track used qty
  extra: Object,
  usedSamples: [usedSampleSchema],        // ✅ Track which customers got samples
});

const assignmentSchema = new mongoose.Schema({
  /* 🔹 Hierarchy Chain */
  rootId: { type: String, required: true },   // Admin level ID (always present)
  rmId: { type: String, default: "" },        // Regional Manager ID
  bmId: { type: String, default: "" },        // Branch Manager ID
  managerId: { type: String, default: "" },   // Manager ID (optional, next level)

  /* 🔹 Assignment Details */
  item: { type: String, required: true },
  year: { type: String, default: () => new Date().getFullYear().toString() },  // ✅ Year from stock
  lot: { type: String, default: "Lot 1" },                                      // ✅ Lot from stock
  employees: [employeeSchema],
  purpose: { type: String, default: "" },
  assignedBy: { type: String, default: "" },
  assignerEmpCode: { type: String, default: "" }, // ✅ EmpCode of the person who assigned
  role: { type: String, default: "" },
  region: { type: String, default: "" },
  branch: { type: String, default: "" },
  date: { type: String, default: () => new Date().toLocaleString() },

  /* 🔹 Vendor/Dispatch Controls */
  toVendor: { type: Boolean, default: false },
  lrNo: { type: String, default: "" },                 // Vendor LR no
  lrUpdatedBy: { type: String, default: "" },          // Who updated LR
  lrUpdatedAt: { type: String, default: "" },          // Timestamp for LR update

  /* 🔹 Admin POD Update Status */
  podUpdatedForEmp: { type: Boolean, default: false }, // ✅ Admin confirms POD visible to emp
  podUpdatedAt: { type: String, default: "" },

  /* 🔹 Audit Info */
  createdAt: { type: Date, default: Date.now },
});


export default mongoose.model("Assignment", assignmentSchema);
