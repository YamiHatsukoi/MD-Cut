// Rebuilds the renderer/main from source, then runs `electron-builder --win
// --dir` and zips the result.
//
// electron-builder's winCodeSign asset (needed for future NSIS/code-signing
// support, unused by the --dir portable target) fails to extract on Windows
// without Developer Mode/admin rights due to symlinks in the archive. That
// failure makes electron-builder exit non-zero partway through packaging.
//
// Critically, when release/win-unpacked already exists from a previous
// build, electron-builder aborts on that error WITHOUT overwriting the
// previous app.asar/exe — so a failed build leaves stale output that still
// passes an "does MD-Cut.exe exist" check. That silently shipped stale code
// once already. To make failure actually visible, we always wipe
// win-unpacked before building, so a partial/failed run leaves an
// unmistakable gap instead of quietly-stale files.
const path = require("node:path");
const fs = require("node:fs");
const { spawnSync, execFileSync } = require("node:child_process");

const projectRoot = path.join(__dirname, "..");
const winUnpackedDir = path.join(projectRoot, "release", "win-unpacked");
const exePath = path.join(winUnpackedDir, "MD-Cut.exe");
const asarPath = path.join(winUnpackedDir, "resources", "app.asar");

const isWindows = process.platform === "win32";
const binExt = isWindows ? ".cmd" : "";
const binPath = (name) => path.join(projectRoot, "node_modules", ".bin", name + binExt);
const electronBuilderBin = binPath("electron-builder");

// Invoked directly via node_modules/.bin instead of `npm run build`, and
// with shell:true — on Windows, Node's spawnSync throws EINVAL for a .cmd
// file unless shell:true is set (this affects every .bin/*.cmd here,
// including electron-builder below).
for (const [bin, args] of [["tsc", ["-b"]], ["vite", ["build"]]]) {
  const stepResult = spawnSync(binPath(bin), args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: isWindows,
  });
  if (stepResult.status !== 0) {
    console.error(`\n❌ "${bin} ${args.join(" ")}" thất bại (exit code ${stepResult.status}) — dừng lại, không đóng gói.`);
    process.exit(stepResult.status || 1);
  }
}

fs.rmSync(winUnpackedDir, { recursive: true, force: true });

const result = spawnSync(electronBuilderBin, ["--win", "--dir"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: isWindows,
});

if (!fs.existsSync(exePath) || !fs.existsSync(asarPath)) {
  console.error(
    `\n❌ Không thấy ${exePath} hoặc app.asar sau khi build — electron-builder thất bại thật sự (exit code ${result.status}), không chỉ do lỗi winCodeSign quen thuộc.`
  );
  process.exit(result.status || 1);
}

if (result.status !== 0) {
  console.log(
    "\n(Bỏ qua lỗi winCodeSign ở trên — đó là lỗi tải asset ký code cho NSIS, không dùng tới ở bản portable --dir. Vì win-unpacked/ đã bị xóa trước khi build, MD-Cut.exe/app.asar tồn tại nghĩa là chúng thực sự vừa được ghi lại, không phải file cũ sót lại.)"
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
