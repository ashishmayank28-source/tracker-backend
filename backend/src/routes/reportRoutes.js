import express from "express";
import {
  getHierarchyReports,
  getReportsSummary,
  getReportsDump,
  getSubmittedReports,   // ✅ naya import
} from "../controllers/reportController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

// Role-based fetched reports
router.get("/hierarchy", protect, getHierarchyReports);

// Aggregated summary
router.get("/summary", protect, getReportsSummary);

// 🔹 Admin report dump
router.get("/dump", protect, adminOnly, getReportsDump);

// 🔹 Submitted Reports (summary + detailed table)
router.get("/submitted", protect, getSubmittedReports);   // ✅ NEW

// 🔹 Users list (role-based)
router.get("/users", protect, async (req, res) => {
  try {
    const { role, empCode, branch, region } = req.user;
    let filter = {};

    if (role === "RegionalManager") {
      filter.region = region;
    } else if (role === "BranchManager") {
      filter.branch = branch;
    } else if (role === "Manager") {
      // ✅ use reportTo array instead of managerEmpCode field
      filter = { "reportTo.empCode": empCode };
    }

    const users = await User.find(filter).lean();
    res.json(users);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// 🔹 Direct reportees for any user (reusable for dashboards)
router.get("/reportees/:empCode", protect, async (req, res) => {
  try {
    const { empCode } = req.params;
    const reportees = await User.find({ "reportTo.empCode": empCode }).lean();
    res.json(reportees || []);
  } catch (err) {
    console.error("Reportees fetch error:", err);
    res.status(500).json({ message: "Failed to fetch reportees" });
  }
});

export default router;
