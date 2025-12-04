import mongoose from "mongoose";

/* ---------- Visit Subdocument ---------- */
const visitSchema = new mongoose.Schema({
  meetingType: String,
  callType: String,
  activity: String,
  discussion: String,
  opportunityType: String,
  orderStatus: String,
  orderValue: Number,
  orderLossReason: String,
  nextMeetingDate: Date,
  expectedOrderDate: Date,
  reason: String,
  attendees: String,
  purpose: String,

  vertical: { type: String, default: "-" },
  distributorName: { type: String, default: "-" },
  distributorCode: { type: String, default: "-" },
  orderType: { type: String, default: "-" },
  itemName: { type: String, default: "-" },
  poNumber: { type: String, default: "-" },
  poFileUrl: { type: String, default: "-" },

  reportedBy: { type: String, default: "Employee" },
  approved: { type: Boolean, default: false },
  approvedBy: String,
  approvedDate: Date,
  submitted: { type: Boolean, default: false },
  submittedBy: String,
  submittedDate: Date,
  createdBy: String,
  date: { type: Date, default: Date.now },
});

/* ---------- Customer Schema ---------- */
const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, unique: true, required: true },
    customerType: { type: String, default: "Manual" },
    name: { type: String, required: true },

    customerMobile: { type: String, default: "NA" },
    
    company: String,
    designation: String,

    vertical: { type: String, default: "-" },

    expectedOrderDate: Date,

    createdBy: {
      empCode: String,
      name: String,
    },

    visits: [visitSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Customer", customerSchema);
