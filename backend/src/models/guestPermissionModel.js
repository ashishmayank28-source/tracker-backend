import mongoose from "mongoose";

const guestPermissionSchema = new mongoose.Schema(
  {
    // ✅ List of allowed tile IDs for guest users
    allowedTiles: {
      type: [String],
      default: [],
    },
    
    // ✅ Guest login credentials (can be shared)
    guestUsername: {
      type: String,
      default: "guest",
    },
    guestPassword: {
      type: String,
      default: "guest123",
    },
    
    // ✅ Is guest login enabled?
    isEnabled: {
      type: Boolean,
      default: true,
    },
    
    // ✅ Last updated by admin
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Available tiles for admin dashboard (for reference)
export const AVAILABLE_TILES = [
  { id: "users", label: "👥 Users", color: "#3b82f6" },
  { id: "user-details", label: "📋 User Details", color: "#8b5cf6" },
  { id: "user-profiles", label: "✏️ User Profiles", color: "#f97316" },
  { id: "attendance", label: "📅 Attendance", color: "#10b981" },
  { id: "performance", label: "⭐ Performance", color: "#f59e0b" },
  { id: "daily", label: "📝 Daily Tracker", color: "#06b6d4" },
  { id: "revenue", label: "💰 Revenue", color: "#22c55e" },
  { id: "assets", label: "🎁 Assets", color: "#ec4899" },
  { id: "retailers", label: "🏬 Retailers DB", color: "#6366f1" },
  { id: "dump", label: "🗂 Dump Management", color: "#ef4444" },
  { id: "ledger", label: "📊 Assignment Ledger", color: "#14b8a6" },
  { id: "assignment-table", label: "📋 Assignment Table", color: "#a855f7" },
  { id: "travel", label: "✈️ Travel Requests", color: "#0ea5e9" },
];

const GuestPermission = mongoose.model("GuestPermission", guestPermissionSchema);
export default GuestPermission;
