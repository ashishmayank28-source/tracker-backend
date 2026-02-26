import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  createTourRequest,
  getMyTourRequests,
  getManagerTourRequests,
  getAllTourRequests,
  approveTourRequest,
  rejectTourRequest,
  submitTourExpenses,
  verifyTourExpenses,
  rejectTourExpenses,
  markAsReimbursed,
} from "../controllers/tourApprovalController.js";

const router = express.Router();

// ✅ Multer config for expense file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const dir = path.join("uploads", `${year}`, `${month}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `tour_${Date.now()}_${safe}`);
  },
});

const expenseUpload = multer({ storage }).fields([
  { name: "bills", maxCount: 1 },
  { name: "tickets", maxCount: 1 },
  { name: "invoices", maxCount: 1 },
]);

// Employee Routes
router.post("/request", authMiddleware, createTourRequest);
router.get("/my-requests", authMiddleware, getMyTourRequests);
router.put("/expenses/:id", authMiddleware, expenseUpload, submitTourExpenses); // ✅ With file upload

// Manager/BM Routes
router.get("/manager-requests", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager"]), getManagerTourRequests);
router.put("/approve/:id", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager", "Admin"]), approveTourRequest);
router.put("/reject/:id", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager", "Admin"]), rejectTourRequest);

// ✅ Expense Verification Routes (same manager who approved)
router.put("/verify-expense/:id", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager", "Admin"]), verifyTourExpenses);
router.put("/reject-expense/:id", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager", "Admin"]), rejectTourExpenses);

// Admin Routes
router.get("/all-requests", authMiddleware, requireRole(["Admin", "RegionalManager"]), getAllTourRequests);
router.put("/reimburse/:id", authMiddleware, requireRole(["Admin"]), markAsReimbursed);

export default router;


