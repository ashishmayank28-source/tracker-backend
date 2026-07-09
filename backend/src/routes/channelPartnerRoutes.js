import { Router } from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getActiveChannelPartners,
  getAllChannelPartners,
  createChannelPartner,
  updateChannelPartner,
  deleteChannelPartner,
} from "../controllers/channelPartnerController.js";

const router = Router();

// For employees (read)
router.get("/", protect, getActiveChannelPartners);

// For admin (manage)
router.get("/all", protect, adminOnly, getAllChannelPartners);
router.post("/", protect, adminOnly, createChannelPartner);
router.put("/:id", protect, adminOnly, updateChannelPartner);
router.delete("/:id", protect, adminOnly, deleteChannelPartner);

export default router;

