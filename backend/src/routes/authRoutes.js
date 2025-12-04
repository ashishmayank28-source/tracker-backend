// backend/src/routes/authRoutes.js
import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // ✅ Use only this

const router = Router();

// 🔹 Login route
router.post("/login", login);

// 🔹 Protected route to get current user
router.get("/me", authMiddleware, me);

export default router;
