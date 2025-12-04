import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

/**
 * GET /api/branch/reportees/:empCode
 * List all employees in branch of this Branch Manager
 */
router.get("/reportees/:empCode", protect, async (req, res) => {
  try {
    const { empCode } = req.params;

    // Branch Manager
    const branchManager = await User.findOne({ empCode }).lean();
    if (!branchManager)
      return res.status(404).json({ message: "Branch Manager not found" });

    // All users in same branch (excluding self)
    const reportees = await User.find({
      branch: branchManager.branch,
      empCode: { $ne: empCode },
    }).lean();

    res.json(reportees);
  } catch (err) {
    console.error("Branch reportees error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
