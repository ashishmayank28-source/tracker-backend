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
      enum: ["Pending", "Approved", "Rejected", "ExpenseSubmitted", "Verified", "Completed"],
      default: "Pending" 
    },
    approvedBy: { type: String, default: null },
    approvedByCode: { type: String, default: null }, // ✅ Store manager empCode for verification
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
    visitedCustomerIds: { type: [String], default: [] },

    /* 🔹 Expense Documents (Bills, Tickets, Invoices) */
    billsUrl: { type: String, default: "" },
    ticketsUrl: { type: String, default: "" },
    invoicesUrl: { type: String, default: "" },

    /* 🔹 Expense Verification (by same manager who approved) */
    expenseVerified: { type: Boolean, default: false },
    verifiedBy: { type: String, default: null },
    verifiedByCode: { type: String, default: null },
    verifiedDate: { type: Date },
    verificationRemarks: { type: String, default: "" },

    /* 🔹 Reimbursement Status (by Admin after salary payment) */
    reimbursed: { type: Boolean, default: false },
    reimbursedBy: { type: String, default: null },
    reimbursedDate: { type: Date },
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


