// backend/src/models/sampleAllocationModel.js
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const sampleAllocationSchema = new mongoose.Schema({
  allocationId: { type: String, default: () => uuidv4() }, // unique ID
  year: { type: Number, required: true },
  item: { type: String, required: true },

  employees: [
    {
      empCode: String,
      name: String,
      qty: Number,
    },
  ],

  purpose: { type: String },
  assignedBy: String,        // empCode of assigner
  assignedByName: String,    // display name
  date: { type: Date, default: Date.now },
});

export default mongoose.model("SampleAllocation", sampleAllocationSchema);
