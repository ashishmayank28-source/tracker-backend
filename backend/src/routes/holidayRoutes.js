import express from "express";
import Holiday from "../models/holidayModel.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =============================================================
   📅 GET All Holidays (Public - for all users)
============================================================= */
router.get("/", protect, async (req, res) => {
  try {
    const { year } = req.query;
    let query = {};
    
    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }
    
    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    console.error("Fetch holidays error:", err);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
});

/* =============================================================
   📅 GET Holidays for a date range
============================================================= */
router.get("/range", protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ message: "from and to dates required" });
    }
    
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    
    const holidays = await Holiday.find({
      date: { $gte: fromDate, $lte: toDate }
    }).sort({ date: 1 });
    
    // Return as array of date strings for easy lookup
    const holidayDates = holidays.map(h => ({
      date: h.date.toISOString().slice(0, 10),
      name: h.name,
      type: h.type,
    }));
    
    res.json(holidayDates);
  } catch (err) {
    console.error("Fetch holiday range error:", err);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
});

/* =============================================================
   ➕ ADD Holiday (Admin Only)
============================================================= */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { date, name, description, type } = req.body;
    
    if (!date || !name) {
      return res.status(400).json({ message: "Date and name are required" });
    }
    
    // Check if holiday already exists
    const existing = await Holiday.findOne({ 
      date: new Date(date) 
    });
    
    if (existing) {
      return res.status(400).json({ 
        message: `Holiday already exists on this date: ${existing.name}` 
      });
    }
    
    const holiday = new Holiday({
      date: new Date(date),
      name,
      description: description || "",
      type: type || "Company",
      createdBy: {
        empCode: req.user.empCode,
        name: req.user.name,
      },
    });
    
    await holiday.save();
    res.status(201).json({ 
      success: true, 
      message: `✅ Holiday "${name}" added successfully!`,
      holiday 
    });
  } catch (err) {
    console.error("Add holiday error:", err);
    res.status(500).json({ message: "Failed to add holiday" });
  }
});

/* =============================================================
   ✏️ UPDATE Holiday (Admin Only)
============================================================= */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, description, type } = req.body;
    
    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { date: new Date(date), name, description, type },
      { new: true }
    );
    
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }
    
    res.json({ success: true, message: "Holiday updated", holiday });
  } catch (err) {
    console.error("Update holiday error:", err);
    res.status(500).json({ message: "Failed to update holiday" });
  }
});

/* =============================================================
   🗑️ DELETE Holiday (Admin Only)
============================================================= */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await Holiday.findByIdAndDelete(id);
    
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }
    
    res.json({ 
      success: true, 
      message: `✅ Holiday "${holiday.name}" deleted successfully!` 
    });
  } catch (err) {
    console.error("Delete holiday error:", err);
    res.status(500).json({ message: "Failed to delete holiday" });
  }
});

export default router;

