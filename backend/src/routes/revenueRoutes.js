import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getManagerRevenue,
  approveRevenue,
  addManualSale,
  submitManagerReport,
  uploadPOForManager,
  managerPOUploader,
  submitBMEntries,
  getRMRevenue,      // ✅ NEW
  getAdminRevenue,   // ✅ NEW
} from "../controllers/revenueController.js";

const router = express.Router();

// ✅ Manager Revenue route
router.get("/manager", protect, getManagerRevenue);

// ✅ Regional Manager Revenue route (BM submitted)
router.get("/rm", protect, getRMRevenue);

// ✅ Admin Revenue route (All BM submitted)
router.get("/admin", protect, adminOnly, getAdminRevenue);

// ✅ Other routes
router.post("/approve/:id", protect, approveRevenue);
router.post("/manual", protect, addManualSale);
router.post("/submit", protect, submitManagerReport);
router.post("/manager-upload", protect, managerPOUploader, uploadPOForManager);

// ✅ BM → RM/Admin submission
router.post("/submit-bm", protect, submitBMEntries);

export default router;
