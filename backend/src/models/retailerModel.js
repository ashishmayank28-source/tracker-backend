import mongoose from "mongoose";

const retailerSchema = new mongoose.Schema(
  {
    // ✅ Customer UID - Unique identifier
    customerUID: {
      type: String,
      unique: true,
      sparse: true, // Allow null values
      index: true,
    },
    ownerMobile: {
      type: String,
      required: true,
      index: true,
    },
    companyGSTN: {
      type: String,
      uppercase: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    companyEmail: String,
    companyAddress: String,
    city: {
      type: String,
      required: true,
    },
    cityPIN: String,
    distributorCode: String,
    distributorName: String,
    cpmEID: String,
    cpmName: String,
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
  },
  { timestamps: true }
);

// Index for faster searches
retailerSchema.index({ companyName: "text", ownerName: "text", city: "text" });

// ✅ Auto-generate Customer UID before save if not provided
retailerSchema.pre("save", async function (next) {
  if (!this.customerUID) {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.customerUID = `RET${dateStr}${random}`;
  }
  next();
});

const Retailer = mongoose.model("Retailer", retailerSchema);

export default Retailer;






