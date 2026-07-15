import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { getScopedUsers } from "../utils/scopeUtils.js";

const router = express.Router();

router.get("/team", protect, requireRole("Manager"), async (req, res) => {
  try {
    const team = await getScopedUsers(req.user);
    res.json(team);
  } catch (err) {
    console.error("Manager /team error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
