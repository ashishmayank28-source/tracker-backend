import mongoose from "mongoose";

const retailerSchema = new mongoose.Schema(
  {
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

const Retailer = mongoose.model("Retailer", retailerSchema);

export default Retailer;






