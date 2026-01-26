import express from "express";
import {
  // Asset Items
  getAssetItems,
  getAllAssetItems,
  createAssetItem,
  updateAssetItem,
  deleteAssetItem,
  // Asset Requests
  createAssetRequest,
  getMyAssetRequests,
  getBMPendingRequests,
  getBMAllRequests,
  bmApproveRequest,
  getApprovedRequests,
  getAllRequests,
  adminAssignRequest,
  completeRequest,
} from "../controllers/assetRequestController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// 🟢 ASSET ITEMS ROUTES (Dropdown Management)
// ============================================

// Get active items (for dropdown) - All users
router.get("/items", getAssetItems);

// Get all items including inactive - Admin only
router.get("/items/all", adminOnly, getAllAssetItems);

// Create item - Admin only
router.post("/items", adminOnly, createAssetItem);

// Update item - Admin only
router.put("/items/:id", adminOnly, updateAssetItem);

// Delete item - Admin only
router.delete("/items/:id", adminOnly, deleteAssetItem);

// ============================================
// 🔵 ASSET REQUESTS ROUTES
// ============================================

// Create new request - Employee/Manager
router.post("/", createAssetRequest);

// Get my requests - Employee/Manager
router.get("/my", getMyAssetRequests);

// Get pending requests for BM approval - Branch Manager
router.get("/bm/pending", getBMPendingRequests);

// Get all requests under BM - Branch Manager
router.get("/bm/all", getBMAllRequests);

// Approve/Reject request - Branch Manager
router.put("/bm/approve/:id", bmApproveRequest);

// Get approved requests for Admin - Admin only
router.get("/approved", adminOnly, getApprovedRequests);

// Get all requests - Admin only
router.get("/all", adminOnly, getAllRequests);

// Assign request - Admin only
router.put("/assign/:id", adminOnly, adminAssignRequest);

// Complete request - Admin only
router.put("/complete/:id", adminOnly, completeRequest);

export default router;
