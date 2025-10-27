// backend/src/models/assetLedgerModel.js
import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  assignmentId: { type: String, required: true, unique: true },  // 🔹 Unique assignment ID
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
  assetName: String,
  qty: { type: Number, default: 0 },
});

const assetLedgerSchema = new mongoose.Schema({
  empCode: { type: String, required: true },
  name: { type: String },
  role: { type: String },
  branch: { type: String },
  region: { type: String },
  type: { type: String, enum: ["sampleBoard", "gift", "companyAsset"], required: true },

  assignments: [assignmentSchema],

  // Tracking fields
  lrDetails: { type: String },     // vendor/admin update
  remark: { type: String },        // end user remark when received
  usage: { type: String },         // employee fills usage
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("AssetLedger", assetLedgerSchema);
