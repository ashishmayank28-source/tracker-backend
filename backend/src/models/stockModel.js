import mongoose from "mongoose";

const stockItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: String, default: new Date().getFullYear().toString() },
  lot: { type: String, default: "Lot 1" },
  Opening: { type: Number, default: 0 },
  Issued: { type: Number, default: 0 },
  Balance: { type: Number, default: 0 },
  // Dynamic columns stored as object
  extraColumns: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Main stock configuration schema
const stockConfigSchema = new mongoose.Schema({
  columns: { type: [String], default: ["Opening", "Issued", "Balance"] },
  items: [stockItemSchema],
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

const Stock = mongoose.model("Stock", stockConfigSchema);
export default Stock;

