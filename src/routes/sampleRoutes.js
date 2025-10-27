// backend/src/routes/sampleRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import SampleAllocation from "../models/sampleAllocationModel.js";
import SampleStock from "../models/sampleStockModel.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

/* ---------- Get Stock (year wise) ---------- */
router.get("/stock/:year", protect, async (req, res) => {
  try {
    const { year } = req.params;
    const stock = await SampleStock.findOne({ year }).lean();
    if (!stock) {
      return res.json({ year, items: [] });
    }
    res.json(stock);
  } catch (err) {
    console.error("Stock fetch error:", err);
    res.status(500).json({ message: "Failed to fetch stock" });
  }
});

/* ---------- Update Stock (Admin only) ---------- */
router.put("/stock/:year", protect, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { year } = req.params;
    const { items } = req.body;

    const updated = await SampleStock.findOneAndUpdate(
      { year },
      { items },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Stock update error:", err);
    res.status(500).json({ message: "Failed to update stock" });
  }
});

/* ---------- Allocate Sample ---------- */
router.post("/allocate", protect, async (req, res) => {
  try {
    const { item, employees, purpose, year } = req.body;

    const allocation = new SampleAllocation({
      allocationId: uuidv4(),
      item,
      employees,
      purpose,
      year,
      assignedBy: req.user.empCode,
      assignedByName: req.user.name,
      date: new Date(),
    });

    await allocation.save();
    res.status(201).json(allocation);
  } catch (err) {
    console.error("Allocation error:", err);
    res.status(500).json({ message: "Failed to allocate stock" });
  }
});

/* ---------- Get Allocations ---------- */
router.get("/allocations/:year", protect, async (req, res) => {
  try {
    const { year } = req.params;
    const allocations = await SampleAllocation.find({ year }).lean();
    res.json(allocations);
  } catch (err) {
    console.error("Allocation fetch error:", err);
    res.status(500).json({ message: "Failed to fetch allocations" });
  }
});

export default router;
