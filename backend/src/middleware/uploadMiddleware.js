import multer from "multer";
import { ensureUploadMonthDir } from "../utils/uploadsPath.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { dir } = ensureUploadMonthDir();
    cb(null, dir);
  },

  filename: function (req, file, cb) {
    // unique filename with timestamp
    const uniqueName = `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

// 🧩 File filter: allow only images & PDFs
const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type! Only images and PDFs allowed."), false);
  }
};

// 🧩 Final upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export default upload;
