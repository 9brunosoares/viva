import { Special } from "../src/engine.ts";
export function specialFromLabel(label: string): Special | undefined {
  const raw = label.includes("poder ")
    ? label.split("poder ")[1].split(",")[0]
    : undefined;
  return raw
    ? (
        {
          horizontal: "row",
          vertical: "column",
          "em área": "area",
          "de cores": "color",
          row: "row",
          column: "column",
          area: "area",
          color: "color",
        } as Record<string, Special>
      )[raw]
    : undefined;
}
export async function waitForCache(page: any) {
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    return !!(await navigator.serviceWorker.ready).active;
  });
}
