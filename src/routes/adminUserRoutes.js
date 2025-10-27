import express from "express";
import User from "../models/userModel.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Admin: Fetch all users list
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}, "-password"); // sab users, password exclude
    res.json(users);
  } catch (err) {
    console.error("Error fetching all users (admin):", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

export default router;
