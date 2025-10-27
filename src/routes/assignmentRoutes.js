import express from "express";
import {
  // 🔹 Admin
  createAdminAssignment,
  getAdminHistory,

  // 🔹 Regional Manager
  getRegionalStock,
  allocateRegional,

  // 🔹 Branch Manager
  getBranchStock,
  createBranchAssignment,

  // 🔹 Manager
  getManagerStock,
  allocateManager,

  // 🔹 Common
  getEmployeeStock,
  submitToVendor,
  updateLRNo,
  getVendorList, // ✅ added here
} from "../controllers/assignmentController.js";

import { protect, adminOnly, vendorOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ------------------------------------------------------------------
 🟢 ADMIN ROUTES
------------------------------------------------------------------ */

// ✅ Admin creates new assignment
router.post("/admin", protect, adminOnly, createAdminAssignment);

// ✅ Admin fetches full history
router.get("/history/admin", protect, adminOnly, getAdminHistory);

/* ------------------------------------------------------------------
 🔵 REGIONAL MANAGER ROUTES
------------------------------------------------------------------ */

// ✅ RM stock fetch (RM’s own assigned items)
router.get("/regional/stock", protect, getRegionalStock);

// ✅ RM allocates to BMs
router.post("/allocate/rm", protect, allocateRegional);

/* ------------------------------------------------------------------
 🟣 BRANCH MANAGER ROUTES
------------------------------------------------------------------ */

// ✅ BM stock fetch
router.get("/branch/stock", protect, getBranchStock);

// ✅ BM allocates to Managers
router.post("/allocate/bm", protect, createBranchAssignment);

/* ------------------------------------------------------------------
 🟠 MANAGER ROUTES
------------------------------------------------------------------ */

// ✅ Manager stock fetch
router.get("/manager/stock", protect, getManagerStock);

// ✅ Manager allocates to Employees
router.post("/allocate/manager", protect, allocateManager);

/* ------------------------------------------------------------------
 🟡 EMPLOYEE ROUTE
------------------------------------------------------------------ */

// ✅ Employee’s stock and allocation history
router.get("/employee/:empCode", protect, getEmployeeStock);

/* ------------------------------------------------------------------
 🔴 VENDOR + DISPATCH ROUTES
------------------------------------------------------------------ */

// ✅ Submit any Project/Marketing assignment to Vendor
router.post("/dispatch/:rootId", protect, submitToVendor);

// ✅ LR Number update (by Admin or Vendor)
router.put("/vendor/lr/:rootId", protect, updateLRNo);

// ✅ Vendor view list (Project/Marketing + sent to vendor)
router.get("/vendor/list", protect, getVendorList);

export default router;
