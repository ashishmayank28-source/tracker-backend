import mongoose from "mongoose";

const tourApprovalSchema = new mongoose.Schema(
  {
    /* 🔹 Employee Details */
    empCode: { type: String, required: true },
    empName: { type: String, required: true },
    branch: { type: String, default: "-" },
    region: { type: String, default: "-" },

    /* 🔹 Reporting Manager Details */
    managerCode: { type: String, required: true },
    managerName: { type: String, default: "-" },

    /* 🔹 Tour Request Details */
    toLocation: { type: String, required: true },
    purpose: { type: String, required: true },
    requestDate: { type: Date, default: Date.now },

    /* 🔹 Approval Status */
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected", "Completed"],
      default: "Pending" 
    },
    approvedBy: { type: String, default: null },
    approvedDate: { type: Date },
    rejectedBy: { type: String, default: null },
    rejectedDate: { type: Date },
    rejectReason: { type: String, default: null },

    /* 🔹 Expense Details (filled after tour completion) */
    expensesFilled: { type: Boolean, default: false },
    travelExpense: { type: Number, default: 0 },
    foodExpense: { type: Number, default: 0 },
    accommodationExpense: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    expenseDate: { type: Date },
    expenseRemarks: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
tourApprovalSchema.index({ empCode: 1, status: 1 });
tourApprovalSchema.index({ managerCode: 1, status: 1 });

const TourApproval = mongoose.model("TourApproval", tourApprovalSchema);
export default TourApproval;


