import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  getEmployeePerformance,
  getPerformanceFilters,
  getPerformanceOverview,
} from "../controllers/performanceController.js";

const router = express.Router();
const allow = ["Admin", "RegionalManager", "BranchManager", "Manager"];

router.get("/filters", authMiddleware, requireRole(allow), getPerformanceFilters);
router.get("/overview", authMiddleware, requireRole(allow), getPerformanceOverview);
router.get("/employee/:empCode", authMiddleware, requireRole(allow), getEmployeePerformance);

export default router;
