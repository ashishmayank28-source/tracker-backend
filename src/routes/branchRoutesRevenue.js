import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Customer from "../models/customerModel.js";
import Revenue from "../models/revenueModel.js";
import User from "../models/userModel.js";

const router = express.Router();

/**
 * 🔹 Branch Revenue (fetch submitted data)
 */
router.get("/revenue", protect, async (req, res) => {
  try {
    const branchManager = req.user;
    if (!branchManager?.branch)
      return res.status(400).json({ message: "Branch missing in user record" });

    const { from, to, empCode } = req.query;

    const employees = await User.find({ branch: branchManager.branch }).lean();
    const empCodes = employees.map((e) => e.empCode);
    const filterEmpCodes = empCode && empCode !== "all" ? [empCode] : empCodes;

    let reports = [];

    // 🔹 Customer-based (submitted reports)
    const customers = await Customer.find({
      "visits.createdBy": { $in: filterEmpCodes },
      "visits.submitted": true,
    }).lean();

    customers.forEach((c) => {
      (c.visits || [])
        .filter((v) => v.submitted)
        .forEach((v) => {
          reports.push({
            _id: v._id,
            empCode: v.createdBy,
            empName: employees.find((e) => e.empCode === v.createdBy)?.name || "-",
            branch: branchManager.branch,
            customerName: c.name,
            customerType: c.customerType,
            vertical: v.vertical,
            distributorCode: v.distributorCode,
            distributorName: v.distributorName,
            orderType: v.orderType,
            itemName: v.itemName,
            orderValue: v.orderValue,
            poNumber: v.poNumber,
            poFileUrl: v.poFileUrl,
            submittedBy: v.submittedBy,
            date: v.date,
          });
        });
    });

    // 🔹 Revenue-based (manual entries)
    const manualRevenues = await Revenue.find({
      branch: branchManager.branch,
      submitted: true,
      empCode: { $in: filterEmpCodes },
    }).lean();

    manualRevenues.forEach((r) => {
      reports.push({
        _id: r._id,
        empCode: r.empCode,
        empName: employees.find((e) => e.empCode === r.empCode)?.name || "-",
        branch: r.branch,
        customerName: r.customerName,
        customerType: r.customerType,
        vertical: r.verticalType,
        distributorCode: r.distributorCode,
        distributorName: r.distributorName,
        orderType: r.orderType,
        itemName: r.itemName,
        orderValue: r.orderValue,
        poNumber: r.poNumber,
        poFileUrl: r.poFileUrl,
        submittedBy: r.submittedBy || "-",
        date: r.submittedAt || r.date,
      });
    });

    // 🔹 Date Filter
    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      reports = reports.filter(
        (r) => new Date(r.date) >= f && new Date(r.date) <= t
      );
    }

    reports.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(reports);
  } catch (err) {
    console.error("Branch Revenue Error:", err);
    res.status(500).json({ message: "Failed to fetch branch revenue" });
  }
});

export default router;
