// backend/src/routes/assetRoutes.js
import express from "express";
import { assignAsset } from "../controllers/assetController.js";

const router = express.Router();

// POST: Assign asset to a user
router.post("/assign", assignAsset);

export default router;
