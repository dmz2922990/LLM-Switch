import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error("Usage: npm run bump -- 1.0.8");
  process.exit(1);
}

const files = [
  {
    path: resolve(root, "package.json"),
    replace: (content) => content.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`),
  },
  {
    path: resolve(root, "src-tauri/Cargo.toml"),
    replace: (content) => content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`),
  },
  {
    path: resolve(root, "src-tauri/tauri.conf.json"),
    replace: (content) => content.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`),
  },
];

for (const { path, replace } of files) {
  const old = readFileSync(path, "utf-8");
  writeFileSync(path, replace(old));
  console.log(`✓ ${path.split("/").slice(-2).join("/")}`);
}

console.log(`\nVersion bumped to ${version}`);
