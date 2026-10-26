import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getUsers,
  createUser,
  removeUser,
  resetPassword,
  updateReportTo,
  removeReportTo,
  updateUserStatus,
} from "../controllers/adminController.js";

const router = express.Router();

// ✅ GET routes - Admin and Guest (read-only) can access
router.get("/users", protect, adminOnly, getUsers);

// ✅ POST/PUT/DELETE routes - Admin only
router.post("/users", protect, adminOnly, createUser);
router.delete("/users/:empCode", protect, adminOnly, removeUser);
router.post("/users/:empCode/reset-password", protect, adminOnly, resetPassword);
router.put("/users/:empCode/status", protect, adminOnly, updateUserStatus);
router.post("/users/:empCode/report-to", protect, adminOnly, updateReportTo);
router.delete("/users/:empCode/report-to/:managerEmpCode", protect, adminOnly, removeReportTo);

export default router;
