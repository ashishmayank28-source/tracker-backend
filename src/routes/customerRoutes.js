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

export default router;
