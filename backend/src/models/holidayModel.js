import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["National", "Regional", "Company", "Optional"],
      default: "Company",
    },
    createdBy: {
      empCode: String,
      name: String,
    },
  },
  { timestamps: true }
);

// Note: `unique: true` on date field already creates an index

export default mongoose.model("Holiday", holidaySchema);

