import mongoose from "mongoose";

const revenueSchema = new mongoose.Schema(
  {
    /* 🔹 Basic Employee Details */
    empCode: { type: String, required: true },
    empName: { type: String, default: "-" },
    branch: { type: String, default: "-" },
    region: { type: String, default: "-" },

    /* 🔹 Manager Details */
    managerCode: { type: String, default: "-" },
    managerName: { type: String, default: "-" },

    /* 🔹 Customer Details */
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerMobile: { type: String, default: "" },
    customerType: { type: String, default: "" },
    verticalType: { type: String, default: "" },
    distributorCode: { type: String, default: "" },
    distributorName: { type: String, default: "" },

    /* 🔹 Order Details */
    orderType: { type: String, default: "Project" },
    orderValue: { type: Number, default: 0 },
    itemName: { type: String, default: "" },
    poNumber: { type: String, default: "" },
    poFileUrl: { type: String, default: "-" },

    /* 🔹 Approval & Reporting */
    reportedBy: { type: String, default: "Employee" },
    approved: { type: Boolean, default: false },
    approvedBy: { type: String, default: null },
    approvedDate: { type: Date },
    orderStatus: { type: String, default: "Won" },
    
    /* 🔹 Submission */
    submitted: { type: Boolean, default: false },
    isSubmitted: { type: Boolean, default: false },
    submittedBy: { type: String, default: null },
    submittedDate: { type: Date },

    /* 🔹 Meta Info */
    isManual: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);


// Helpful index for faster filtering
revenueSchema.index({ empCode: 1, managerCode: 1, date: -1 });

const Revenue = mongoose.model("Revenue", revenueSchema);
export default Revenue;
