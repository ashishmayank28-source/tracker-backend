import express from "express";
import { getRegionTeam } from "../controllers/regionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/team", protect, getRegionTeam);

export default router;
