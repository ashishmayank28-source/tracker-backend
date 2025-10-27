import express from "express";
import bcrypt from "bcryptjs";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

// ✅ Create User (Admin only)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { empCode, password, name, role, area, branch, region, managerEmpCode, branchManagerEmpCode, regionalManagerEmpCode } = req.body;

    if (!["Employee","Manager","BranchManager","RegionalManager","Admin","Vendor"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      empCode,
      passwordHash: hash,
      name,
      role,
      area,
      branch,
      region,
      managerEmpCode,
      branchManagerEmpCode,
      regionalManagerEmpCode,
    });

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

/* ---------- Role-based Users Fetch ---------- */
router.get("/", protect, async (req, res) => {
  try {
    const { role, empCode, branch, region } = req.user;
    let filter = {};

    if (role === "RegionalManager") {
      filter.region = region;
    } else if (role === "BranchManager") {
      filter.branch = branch;
    } else if (role === "Manager") {
      filter.managerEmpCode = empCode;  // ✅ fix: correct field name
    }

    const users = await User.find(filter, "-passwordHash");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

/* ---------- All Users (Admin only) ---------- */
router.get("/all", protect, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const users = await User.find().select("-passwordHash").lean();
    res.json(users);
  } catch (err) {
    console.error("All users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* ---------- Universal Team Route (RM, BM, Manager) ---------- */
router.get("/team", protect, async (req, res) => {
  try {
    const { role, empCode } = req.user;

    if (!["RegionalManager", "BranchManager", "Manager"].includes(role)) {
      return res.status(403).json({ message: "Not authorized to view team" });
    }

    const team = await User.find({ "reportTo.empCode": empCode }).select("-passwordHash");
    res.json(team);
  } catch (err) {
    console.error("Team fetch error:", err);
    res.status(500).json({ message: "Failed to fetch team" });
  }
});
// Get single user by empCode
router.get("/:empCode", protect, async (req, res) => {
  try {
    const user = await User.findOne({ empCode: req.params.empCode });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;
