import express from "express";
import { uploadPO, handlePOUpload } from "../controllers/uploadPOController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// /api/revenue/upload
router.post("/upload", protect, uploadPO, handlePOUpload);

export default router;
