import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createVisit,
  searchCustomer,
  getHistory,
  revisit,
  myReports,   // ✅ IMPORT KIYA
} from "../controllers/customerController.js";
import { protect } from "../middleware/authMiddleware.js";
import Customer from "../models/customerModel.js";



const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const dir = path.join("uploads", `${year}`, `${month}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const formParser = multer({ storage }).single("poFile");



/* ---------- Visits ---------- */
router.post("/new", protect,formParser, createVisit);
router.get("/search", protect, searchCustomer);
router.get("/:id/history", protect, getHistory);
router.post("/:id/revisit", protect,formParser, revisit);

/* ---------- My Submitted Reports (logged-in user) ---------- */
router.get("/my-reports", protect, myReports);

/* ---------- Reports by employee code (optional, admin use) ---------- */
router.get("/by-emp/:empCode", protect, async (req, res) => {
  try {
    const { empCode } = req.params;
    const { from, to } = req.query;

    // Base query
    const query = { "createdBy.empCode": empCode };

    // Date filter if provided
    if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error("by-emp error:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Reports by employee code for Attendance (returns flat reports) ---------- */
router.get("/reports-by-emp/:empCode", protect, async (req, res) => {
  try {
    const { empCode } = req.params;
    const { from, to } = req.query;

    // Build date filter
    let dateFilter = {};
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter = { $gte: fromDate, $lte: toDate };
    }

    // Find customers where employee is creator OR has visits
    const query = {
      $or: [
        { "createdBy.empCode": empCode },
        { "visits.createdBy": empCode },
        { "visits.empCode": empCode },
      ],
    };

    const customers = await Customer.find(query).lean();

    // Flatten to reports array
    const reports = [];
    customers.forEach((c) => {
      // Check if main customer was created by this employee
      if (c.createdBy?.empCode === empCode) {
        const reportDate = c.createdAt || c.date;
        
        // Apply date filter
        if (dateFilter.$gte && dateFilter.$lte) {
          const d = new Date(reportDate);
          if (d < dateFilter.$gte || d > dateFilter.$lte) return;
        }
        
        reports.push({
          customerId: c.customerId,
          name: c.name,
          meetingType: c.meetingType || "External",
          date: reportDate,
          createdAt: c.createdAt,
        });
      }

      // Check visits
      (c.visits || []).forEach((v) => {
        const isEmpVisit = v.createdBy === empCode || v.empCode === empCode;
        if (!isEmpVisit) return;
        
        const reportDate = v.date || v.createdAt;
        
        // Apply date filter
        if (dateFilter.$gte && dateFilter.$lte) {
          const d = new Date(reportDate);
          if (d < dateFilter.$gte || d > dateFilter.$lte) return;
        }
        
        reports.push({
          customerId: c.customerId,
          name: v.name || c.name,
          meetingType: v.meetingType || c.meetingType || "External",
          date: reportDate,
          createdAt: v.createdAt || reportDate,
        });
      });
    });

    res.json(reports);
  } catch (err) {
    console.error("reports-by-emp error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
