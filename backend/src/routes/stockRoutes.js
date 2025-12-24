import express from "express";
import {
  getStock,
  updateStock,
  addStockItem,
  removeStockItem,
  updateStockItem,
} from "../controllers/stockController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// ✅ Get stock table (Admin only)
router.get("/", protect, requireRole("Admin"), getStock);

// ✅ Update entire stock table (Admin only)
router.put("/", protect, requireRole("Admin"), updateStock);

// ✅ Add new stock item (Admin only)
router.post("/item", protect, requireRole("Admin"), addStockItem);

// ✅ Remove stock item (Admin only)
router.delete("/item/:itemId", protect, requireRole("Admin"), removeStockItem);

// ✅ Update single stock item (Admin only)
router.put("/item/:itemId", protect, requireRole("Admin"), updateStockItem);

export default router;

