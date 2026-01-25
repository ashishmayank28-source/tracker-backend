import { Router } from "express";
import { 
  guestLogin, 
  getGuestPermissions, 
  updateGuestPermissions,
  getAvailableTiles 
} from "../controllers/guestController.js";
import { authMiddleware, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

// 🔹 Guest login (public)
router.post("/login", guestLogin);

// 🔹 Get guest permissions (public - for guest dashboard)
router.get("/permissions", getGuestPermissions);

// 🔹 Get available tiles list (for admin UI)
router.get("/tiles", getAvailableTiles);

// 🔹 Update guest permissions (Admin only)
router.put(
  "/permissions",
  authMiddleware,
  requireRole(["Admin"]),
  updateGuestPermissions
);

export default router;
