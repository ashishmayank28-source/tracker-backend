// backend/src/models/reportModel.js
import mongoose from "mongoose";

// 🗂 Report schema for submitted daily tracker reports
const reportSchema = new mongoose.Schema(
  {
    empCode: { type: String, required: true },      // Employee code who submitted
    submittedBy: { type: String },                  // Employee name (optional convenience)
    date: { type: Date, required: true },           // Report date
    customer: { type: String },                     // Customer or visit name
    activity: { type: String },                     // Activity type (e.g., Visit, Call, Internal)
    orderValue: { type: Number, default: 0 },       // Revenue / order value if any
    notes: { type: String },                        // Extra notes or discussion summary
  },
  { timestamps: true }
);

// 🔎 Index for faster queries by empCode & date
reportSchema.index({ empCode: 1, date: -1 });

const Report = mongoose.model("Report", reportSchema);
export default Report;
