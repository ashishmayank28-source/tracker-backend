import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getManagerRevenue,
  approveRevenue,
   getRMRevenue,
  addManualSale,
  submitManagerReport,
  uploadPOForManager,
  managerPOUploader,   // ✅ comma added here
  submitBMEntries,      // ✅ now recognized correctly
   getAdminRevenue,

} from "../controllers/revenueController.js";

const router = express.Router();

// ✅ Manager Revenue route
router.get("/manager", protect, getManagerRevenue);

// ✅ Other routes
router.post("/approve/:id", protect, approveRevenue);
router.post("/manual", protect, addManualSale);
router.post("/submit", protect, submitManagerReport);
router.post("/manager-upload", protect, managerPOUploader, uploadPOForManager);
router.get("/admin", protect, getAdminRevenue);

// ✅ BM → RM/Admin submission
router.post("/submit-bm", protect, submitBMEntries);
router.get("/rm", protect, getRMRevenue);

export default router;
