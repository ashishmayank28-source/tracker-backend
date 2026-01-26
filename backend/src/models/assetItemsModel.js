import mongoose from "mongoose";

// ✅ Asset Items Schema - Admin configurable dropdown items
const assetItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      default: "General",
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
    },
  },
  { timestamps: true }
);

// ✅ Index for faster searches
assetItemSchema.index({ name: 1 });
assetItemSchema.index({ isActive: 1 });

export default mongoose.model("AssetItem", assetItemSchema);
