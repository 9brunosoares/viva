import { build } from "vite";
import { execFileSync } from "node:child_process";
process.env.VITE_ENABLE_QA = "false";
await build();
execFileSync(process.execPath, ["scripts/service-worker.mjs"], {
  stdio: "inherit",
});
