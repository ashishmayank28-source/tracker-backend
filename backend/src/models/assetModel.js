import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema({
  action: { type: String, enum: ["CREATE", "ASSIGN", "UPDATE"], required: true },
  qty: { type: Number, required: true },
  assignedTo: {
    empCode: String,
    name: String,
    role: String,
  },
  assignedBy: {
    empCode: String,
    role: String,
  },
  date: { type: Date, default: Date.now },
});

const assetSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["SampleBoard", "Merchandise", "WrappedGift"], required: true },
    name: { type: String, required: true },
    qty: { type: Number, default: 0 },
    assignedTo: {
      empCode: String,
      name: String,
      role: String,
    },
    assignedBy: {
      empCode: String,
      role: String,
    },
    ledger: [ledgerSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Asset", assetSchema);
