const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

exports.default = async function applyWinIcon(context) {
  if (context.electronPlatformName !== "win32") return;

  const productFilename = context.packager.appInfo.productFilename;
  const executablePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, "build-resources", "icon.ico");
  const rceditPath = path.resolve(
    context.packager.projectDir,
    "..",
    "..",
    "node_modules",
    "electron-winstaller",
    "vendor",
    "rcedit.exe",
  );

  for (const filePath of [executablePath, iconPath, rceditPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required Windows icon resource not found: ${filePath}`);
    }
  }

  await execFileAsync(rceditPath, [executablePath, "--set-icon", iconPath], {
    windowsHide: true,
  });
};
