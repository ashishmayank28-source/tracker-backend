import mongoose from "mongoose";

// ✅ Asset Request Item Schema (for multi-select items)
const requestItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
});

// ✅ Asset Request Schema
const assetRequestSchema = new mongoose.Schema(
  {
    // 🔹 Request ID (auto-generated)
    requestId: {
      type: String,
      unique: true,
    },

    // 🔹 Requester Info
    empCode: { type: String, required: true },
    empName: { type: String, required: true },
    empRole: { type: String, required: true },
    branch: { type: String },
    region: { type: String },

    // 🔹 Request Items (multi-select)
    items: [requestItemSchema],

    // 🔹 Purpose/Remarks
    purpose: { type: String, default: "" },
    remarks: { type: String, default: "" },

    // 🔹 Approval Flow
    status: {
      type: String,
      enum: ["Pending", "BM Approved", "BM Rejected", "Assigned", "Completed"],
      default: "Pending",
    },

    // 🔹 Branch Manager Approval
    bmApproval: {
      status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
      approvedBy: { type: String },
      approvedByName: { type: String },
      approvedAt: { type: Date },
      remarks: { type: String },
    },

    // 🔹 Admin Assignment
    adminAssignment: {
      assignedBy: { type: String },
      assignedByName: { type: String },
      assignedAt: { type: Date },
      assignmentId: { type: String }, // Reference to actual stock assignment
      remarks: { type: String },
    },

    // 🔹 Hierarchy for filtering
    managerId: { type: String },
    bmId: { type: String },
    rmId: { type: String },
  },
  { timestamps: true }
);

// ✅ Auto-generate Request ID before save
assetRequestSchema.pre("save", async function (next) {
  if (!this.requestId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.requestId = `AR${dateStr}${random}`;
  }
  next();
});

// ✅ Indexes
assetRequestSchema.index({ empCode: 1 });
assetRequestSchema.index({ status: 1 });
assetRequestSchema.index({ bmId: 1 });
assetRequestSchema.index({ branch: 1 });

export default mongoose.model("AssetRequest", assetRequestSchema);
