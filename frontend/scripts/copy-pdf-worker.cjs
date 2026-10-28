const fs = require("fs");
const path = require("path");

const packageRoot = path.join(__dirname, "..", "node_modules", "pdfjs-dist");
const publicDir = path.join(__dirname, "..", "public");
const workerSource = path.join(packageRoot, "build", "pdf.worker.min.mjs");

if (!fs.existsSync(workerSource)) {
  process.exit(0);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(workerSource, path.join(publicDir, "pdf.worker.min.mjs"));

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }
  fs.copyFileSync(source, target);
}

const assetDirs = ["cmaps", "standard_fonts", "wasm", "iccs"];
for (const name of assetDirs) {
  const source = path.join(packageRoot, name);
  if (!fs.existsSync(source)) continue;
  copyRecursive(source, path.join(publicDir, "pdfjs", name));
}
