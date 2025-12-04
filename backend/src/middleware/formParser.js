// backend/src/middleware/formParser.js
import multer from "multer";

const storage = multer.memoryStorage();

// 🧩 This middleware now allows optional 'poFile' upload field
export const formParser = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
}).single("poFile");
