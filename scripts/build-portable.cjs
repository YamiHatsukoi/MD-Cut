// Runs `electron-builder --win --dir` and then zips the result.
//
// electron-builder's winCodeSign asset (needed for future NSIS/code-signing
// support, unused by the --dir portable target) fails to extract on Windows
// without Developer Mode/admin rights due to symlinks in the archive. That
// failure makes electron-builder exit non-zero even though the actual
// win-unpacked output was produced correctly — so success here is judged by
// whether MD-Cut.exe exists afterwards, not by the exit code.
const path = require("node:path");
const fs = require("node:fs");
const { spawnSync, execFileSync } = require("node:child_process");

const projectRoot = path.join(__dirname, "..");
const exePath = path.join(projectRoot, "release", "win-unpacked", "MD-Cut.exe");

const isWindows = process.platform === "win32";
const electronBuilderBin = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  isWindows ? "electron-builder.cmd" : "electron-builder"
);

const result = spawnSync(electronBuilderBin, ["--win", "--dir"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
});

if (!fs.existsSync(exePath)) {
  console.error(
    `\n❌ Không thấy ${exePath} sau khi build — electron-builder thất bại thật sự (exit code ${result.status}), không chỉ do lỗi winCodeSign quen thuộc.`
  );
  process.exit(result.status || 1);
}

if (result.status !== 0) {
  console.log(
    "\n(Bỏ qua lỗi winCodeSign ở trên — đó là lỗi tải asset ký code cho NSIS, không dùng tới ở bản portable --dir. MD-Cut.exe đã build thành công.)"
  );
}

const pkg = require(path.join(projectRoot, "package.json"));
const path7za = require("7zip-bin").path7za;
const zipName = `MD-Cut Portable ${pkg.version}.zip`;
const releaseDir = path.join(projectRoot, "release");
const zipPath = path.join(releaseDir, zipName);

if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath);
}

execFileSync(path7za, ["a", "-tzip", zipName, path.join("win-unpacked", "*")], {
  cwd: releaseDir,
  stdio: "inherit",
});

console.log(`\n✅ Đã đóng gói: release/${zipName}`);
