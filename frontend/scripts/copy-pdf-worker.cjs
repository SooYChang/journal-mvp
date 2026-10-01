const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const targetDir = path.join(__dirname, "..", "public");
const target = path.join(targetDir, "pdf.worker.min.mjs");

if (!fs.existsSync(source)) {
  process.exit(0);
}
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
