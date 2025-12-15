import express from "express";
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
} from "../controllers/tourApprovalController.js";

const router = express.Router();

// Employee Routes
router.post("/request", authMiddleware, createTourRequest);
router.get("/my-requests", authMiddleware, getMyTourRequests);
router.put("/expenses/:id", authMiddleware, submitTourExpenses);

// Manager/BM Routes
router.get("/manager-requests", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager"]), getManagerTourRequests);
router.put("/approve/:id", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager", "Admin"]), approveTourRequest);
router.put("/reject/:id", authMiddleware, requireRole(["Manager", "BranchManager", "RegionalManager", "Admin"]), rejectTourRequest);

// Admin Routes
router.get("/all-requests", authMiddleware, requireRole(["Admin", "RegionalManager"]), getAllTourRequests);

export default router;


