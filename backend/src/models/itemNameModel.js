import mongoose from "mongoose";

const itemNameSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

itemNameSchema.index({ name: 1 });
itemNameSchema.index({ isActive: 1, name: 1 });

export default mongoose.model("ItemName", itemNameSchema);
