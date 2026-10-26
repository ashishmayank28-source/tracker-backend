import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render starts from backend/, so keep files in backend/uploads.
export const UPLOADS_DIR = path.join(__dirname, "../../uploads");
// Older local/dev writes may have landed in repo-root/uploads.
export const LEGACY_UPLOADS_DIR = path.join(__dirname, "../../../uploads");

export function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

export function ensureUploadMonthDir(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dir = path.join(UPLOADS_DIR, year, month);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, year, month };
}

export function publicUrlFromDiskFile(file) {
  if (!file?.filename) return "";
  const normalized = String(file.path || "").replace(/\\/g, "/");
  const marker = "/uploads/";
  const idx = normalized.toLowerCase().lastIndexOf(marker);
  if (idx !== -1) return normalized.slice(idx);
  const { year, month } = ensureUploadMonthDir();
  return `/uploads/${year}/${month}/${file.filename}`;
}
