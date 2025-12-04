// fix-api-base.js
import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve("./src");

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDir(filePath);
    } else if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) {
      let content = fs.readFileSync(filePath, "utf8");

      // Find and replace old API_BASE pattern
      const oldLine =
        'import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000"';
      if (content.includes(oldLine)) {
        const updated = content.replace(
          oldLine,
          "import.meta.env.VITE_API_BASE"
        );
        fs.writeFileSync(filePath, updated, "utf8");
        console.log(`✅ Updated: ${filePath}`);
      }
    }
  }
}

console.log("🚀 Scanning files for API_BASE...");
scanDir(SRC_DIR);
console.log("✨ Done. All API_BASE lines have been cleaned!");
