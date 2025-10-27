import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import SampleAllocation from "../models/sampleAllocationModel.js";
import generateAllocationId from "../utils/generateAllocationId.js";

const router = express.Router();

/**
 * POST /api/sample/allocation
 * 🔹 Create new allocation
 */
router.post("/", protect, async (req, res) => {
  try {
    const { item, employees, purpose } = req.body;

    if (!item || !employees?.length) {
      return res.status(400).json({ message: "Item and employees required" });
    }

    const allocation = new SampleAllocation({
      allocationId: generateAllocationId(),
      item,
      employees,
      purpose,
      assignedBy: {
        empCode: req.user.empCode,
        name: req.user.name,
        role: req.user.role,
      },
    });

    await allocation.save();
    res.status(201).json(allocation);
  } catch (err) {
    console.error("Create allocation error:", err);
    res.status(500).json({ message: "Failed to create allocation" });
  }
});

/**
 * GET /api/sample/allocation
 * 🔹 Get all allocations (admin) or own hierarchy allocations
 */
router.get("/", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "Admin") {
      // Non-admin ke liye sirf unke assignedBy ya unke reportees ka data
      query = { "assignedBy.empCode": req.user.empCode };
    }

    const allocations = await SampleAllocation.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(allocations);
  } catch (err) {
    console.error("Get allocations error:", err);
    res.status(500).json({ message: "Failed to fetch allocations" });
  }
});

export default router;
