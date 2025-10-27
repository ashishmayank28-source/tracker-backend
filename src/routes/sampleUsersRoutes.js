import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

/**
 * GET /api/sample/users/admin
 * 🔹 Admin → return ALL users
 */
router.get("/admin", protect, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const users = await User.find().select("-password").lean();
    res.json(users);
  } catch (err) {
    console.error("Sample Admin users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/**
 * GET /api/sample/users/my-team
 * 🔹 RM/BM/Manager → return hierarchy team (flattened)
 */
router.get("/my-team", protect, async (req, res) => {
  try {
    const me = await User.findOne({ empCode: req.user.empCode }).lean();
    if (!me) return res.status(404).json({ message: "User not found" });

    const allUsers = await User.find().lean();

    function buildTree(user) {
      const children = allUsers.filter(
        (u) => u.reportTo?.[0]?.empCode === user.empCode
      );
      return {
        ...user,
        subordinates: children.map((c) => buildTree(c)),
      };
    }

    function flatten(node) {
      let list = [];
      list.push({
        empCode: node.empCode,
        name: node.name,
        role: node.role,
        branch: node.branch,
        region: node.region,
      });
      node.subordinates.forEach((c) => {
        list = list.concat(flatten(c));
      });
      return list;
    }

    const tree = buildTree(me);
    const flatList = flatten(tree).filter((u) => u.empCode !== me.empCode);

    res.json(flatList);
  } catch (err) {
    console.error("Sample my-team error:", err);
    res.status(500).json({ message: "Failed to fetch team" });
  }
});

export default router;
