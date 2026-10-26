import { build } from "vite";
import { execFileSync } from "node:child_process";
process.env.VITE_ENABLE_QA = "true";
await build({ build: { outDir: "dist-qa" } });
execFileSync(process.execPath, ["scripts/service-worker.mjs", "dist-qa"], {
  stdio: "inherit",
});
