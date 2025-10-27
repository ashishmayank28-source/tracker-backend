// backend/src/models/sampleStockModel.js
import mongoose from "mongoose";

const sampleStockSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  items: [
    {
      name: String,
      stock: Number,
    },
  ],
});

export default mongoose.model("SampleStock", sampleStockSchema);
