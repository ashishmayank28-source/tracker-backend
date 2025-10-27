import express from "express";
import {
  getRevenueTrackerEmployee,
  getRevenueTrackerManager, 
  getManagerRevenue,
  approveRevenue,
  addManualSale,
  submitManagerReport,
  uploadPOForManager,
  managerPOUploader,
  } from "../controllers/revenueController.js";
import { uploadPO, handlePOUpload } from "../controllers/uploadPOController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Employee revenue tracker (own data)
router.get("/employee/tracker", protect, getRevenueTrackerEmployee);

// 🔹 Manager revenue tracker (team data)
router.get("/manager/tracker", protect, managerOnly, getRevenueTrackerManager);

// 🔹 Combined revenue (Customer + Manual)
router.get("/manager/combined", protect, managerOnly, getManagerRevenue);

// 🔹 Add Manual Sale
router.post("/manager/manual", protect, managerOnly, addManualSale);



// Upload route (existing)
router.post("/upload", protect, uploadPO, handlePOUpload);

// Manager specific
router.get("/manager", protect, getManagerRevenue);
router.post("/approve/:id", protect, approveRevenue);
router.post("/manual", protect, addManualSale);
router.post("/submit", protect, submitManagerReport);
router.post("/manager-upload", protect, managerPOUploader, uploadPOForManager);
// 🔹 View all team revenues (organization-wide)
router.get("/admin/all", protect, adminOnly, getRevenueTrackerManager);

// 🔹 Approve any revenue globally (Admin override)
router.put("/admin/approve/:id", protect, adminOnly, approveRevenue);

export default router;
