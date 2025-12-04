// backend/src/controllers/uploadPOController.js
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/* ------------------------------------------------------------------
   1️⃣  Multer Storage Setup (auto year/month folders)
------------------------------------------------------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const dir = path.join("uploads", `${year}`, `${month}`);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

/* ------------------------------------------------------------------
   2️⃣  File Type Filter (.jpg, .png, .pdf)
------------------------------------------------------------------ */
export const uploadPO = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG & PDF allowed"));
  },
}).single("poFile");

/* ------------------------------------------------------------------
   3️⃣  Controller: Handle Upload
------------------------------------------------------------------ */
export const handlePOUpload = async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const {
      empCode,
      distributorName,
      distributorCode,
      orderType,
      itemName,
      orderValue,
    } = req.body;

    const fileInfo = {
      fileName: file.filename,
      filePath: file.path,
      sizeKB: Math.round(file.size / 1024),
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      uploadedBy: empCode,
      distributorName,
      distributorCode,
      orderType,
      itemName,
      orderValue,
    };

    // 🔹 Optional: yahan DB me save kar sakte ho (future step)
    res.json({
      success: true,
      message: "File uploaded successfully",
      fileInfo,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

/* ------------------------------------------------------------------
   4️⃣  Archiver Function (for yearly zipping)
------------------------------------------------------------------ */
export const archiveYear = async (year = new Date().getFullYear()) => {
  const srcDir = `uploads/${year}`;
  const dest = `archives/${year}.zip`;
  ensureDir("archives");
  const output = fs.createWriteStream(dest);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.directory(srcDir, false);
  archive.pipe(output);
  await archive.finalize();
};
