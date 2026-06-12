import { Router } from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getActiveItemNames,
  getAllItemNames,
  createItemName,
  updateItemName,
  deleteItemName,
} from "../controllers/itemNameController.js";

const router = Router();

router.get("/", protect, getActiveItemNames);
router.get("/all", protect, adminOnly, getAllItemNames);
router.post("/", protect, adminOnly, createItemName);
router.put("/:id", protect, adminOnly, updateItemName);
router.delete("/:id", protect, adminOnly, deleteItemName);

export default router;
