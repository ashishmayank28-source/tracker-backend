import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { getScopedUsers } from "../utils/scopeUtils.js";

const router = express.Router();

router.get("/reportees/:empCode", protect, requireRole("BranchManager", "Admin"), async (req, res) => {
  try {
    const { empCode } = req.params;

    if (req.user.role !== "Admin" && req.user.empCode !== empCode) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const reportees = await getScopedUsers(req.user);
    res.json(reportees);
  } catch (err) {
    console.error("Branch reportees error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
