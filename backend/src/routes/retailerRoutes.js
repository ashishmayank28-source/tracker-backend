import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createRetailer,
  getRetailers,
  getRetailerById,
  updateRetailer,
  deleteRetailer,
  getMyRetailers,
  searchByMobile,
} from "../controllers/retailerController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create new retailer
router.post("/", createRetailer);

// Get all retailers (with filters)
router.get("/", getRetailers);

// Get my retailers (created by logged-in user)
router.get("/my", getMyRetailers);

// Search by mobile
router.get("/search/:mobile", searchByMobile);

// Get retailer by ID
router.get("/:id", getRetailerById);

// Update retailer
router.put("/:id", updateRetailer);

// Delete retailer
router.delete("/:id", deleteRetailer);

export default router;

