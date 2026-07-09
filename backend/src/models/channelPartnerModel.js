import mongoose from "mongoose";

const channelPartnerSchema = new mongoose.Schema(
  {
    distributorCode: { type: String, required: true, trim: true, unique: true },
    distributorName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

channelPartnerSchema.index({ isActive: 1, distributorName: 1 });

export default mongoose.model("ChannelPartner", channelPartnerSchema);

