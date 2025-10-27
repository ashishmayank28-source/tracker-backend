// backend/src/routes/managerRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js"; // apna User model import karo

const router = express.Router();

// Manager → get direct reportees
router.get("/team", protect, requireRole("Manager"), async (req, res) => {
  try {
    const managerCode = req.user.empCode;
    if (!managerCode) {
      return res.status(400).json({ message: "No Manager empCode" });
    }

    // Sirf wahi user jinke reportTo me manager ka empCode hai
    const employees = await User.find({
      "reportTo.empCode": managerCode,
    }).select("empCode name role");

    res.json(employees);
  } catch (err) {
    console.error("Manager /team error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
