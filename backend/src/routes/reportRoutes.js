import express from "express";
import {
  getHierarchyReports,
  getReportsSummary,
  getReportsDump,
  getSubmittedReports,   // ✅ naya import
} from "../controllers/reportController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";
import { getScopedUsers, isEmpInScope } from "../utils/scopeUtils.js";

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
    if (req.user.role === "Admin") {
      const users = await User.find().lean();
      return res.json(users);
    }
    const users = await getScopedUsers(req.user);
    res.json(users);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/reportees/:empCode", protect, async (req, res) => {
  try {
    const { empCode } = req.params;
    if (req.user.role !== "Admin" && empCode !== req.user.empCode) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const reportees = await getScopedUsers(req.user);
    res.json(reportees || []);
  } catch (err) {
    console.error("Reportees fetch error:", err);
    res.status(500).json({ message: "Failed to fetch reportees" });
  }
});

export default router;
