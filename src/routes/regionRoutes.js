import express from "express";
import { getRegionTeam } from "../controllers/regionController.js";  // <-- yahi import karo

const router = express.Router();

// ✅ Region team ke liye route
router.get("/team", getRegionTeam);

export default router;
