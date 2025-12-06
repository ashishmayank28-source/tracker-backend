import express from "express";
import bcrypt from "bcryptjs";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

// ✅ Create User (Admin only)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { empCode, password, name, role, area, branch, region, managerEmpCode, branchManagerEmpCode, regionalManagerEmpCode, email, mobile, courierAddress } = req.body;

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
      email,
      mobile,
      courierAddress,
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
// Get single user by empCode (omit passwordHash)
router.get("/:empCode", protect, async (req, res) => {
  try {
    const user = await User.findOne({ empCode: req.params.empCode }).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Get current logged-in user (by token)
router.get("/me/profile", protect, async (req, res) => {
  try {
    const empCode = req.user.empCode;
    if (!empCode) return res.status(400).json({ message: "empCode missing in token" });
    const user = await User.findOne({ empCode }).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

/* ---------- Update courier address (self OR admin) ---------- */
router.put("/:empCode/address", protect, async (req, res) => {
  try {
    const { empCode } = req.params;
    const { courierAddress } = req.body;

    // Only allow user to update their own address or admin
    if (req.user.empCode !== empCode && req.user.role?.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this address" });
    }

    const user = await User.findOneAndUpdate(
      { empCode },
      { $set: { courierAddress: courierAddress || "" } },
      { new: true }
    ).select("-passwordHash").lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, message: "Address updated", user });
  } catch (err) {
    console.error("Update address error:", err);
    res.status(500).json({ message: "Failed to update address" });
  }
});

/* ---------- Update profile (self OR admin) ---------- */
router.put('/:empCode', protect, async (req, res) => {
  try {
    const { empCode } = req.params;
    const { name, email, mobile, courierAddress } = req.body;

    // Only allow user to update their own profile or admin
    if (req.user.empCode !== empCode && req.user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const update = {};
    if (typeof name === 'string') update.name = name;
    if (typeof email === 'string') update.email = email;
    if (typeof mobile === 'string') update.mobile = mobile;
    if (typeof courierAddress === 'string') update.courierAddress = courierAddress;

    const user = await User.findOneAndUpdate(
      { empCode },
      { $set: update },
      { new: true }
    ).select('-passwordHash').lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/* ---------- Update Employee Target (Admin only) ---------- */
router.put("/:empCode/target", protect, adminOnly, async (req, res) => {
  try {
    const { empCode } = req.params;
    const { target } = req.body;

    const user = await User.findOneAndUpdate(
      { empCode },
      { target: Number(target) || 0 },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, message: "Target updated", user });
  } catch (err) {
    console.error("Update target error:", err);
    res.status(500).json({ message: "Failed to update target" });
  }
});

/* ---------- Bulk Update Targets (Admin only) ---------- */
router.put("/bulk-targets", protect, adminOnly, async (req, res) => {
  try {
    const { targets } = req.body; // Array of { empCode, target }

    if (!Array.isArray(targets)) {
      return res.status(400).json({ message: "targets must be an array" });
    }

    const updates = await Promise.all(
      targets.map(({ empCode, target }) =>
        User.findOneAndUpdate(
          { empCode },
          { target: Number(target) || 0 },
          { new: true }
        )
      )
    );

    res.json({ 
      success: true, 
      message: `${updates.filter(Boolean).length} targets updated` 
    });
  } catch (err) {
    console.error("Bulk update targets error:", err);
    res.status(500).json({ message: "Failed to update targets" });
  }
});

export default router;
