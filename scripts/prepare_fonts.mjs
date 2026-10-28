import { mkdir, writeFile } from "node:fs/promises";
const dir = "public/assets/fonts";
await mkdir(dir, { recursive: true });
await mkdir("source-assets/premium6", { recursive: true });
const cssUrl =
  "https://fonts.googleapis.com/css2?family=Fraunces:wght@600..700&family=Nunito:wght@400..800&family=Caveat:wght@500..700&display=swap";
const response = await fetch(cssUrl, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
});
if (!response.ok) throw Error(response.statusText);
const css = await response.text();
await writeFile("source-assets/premium6/fonts-source.css", css);
let local = "",
  audit = [];
for (const match of css.matchAll(
  /\/\* (latin(?:-ext)?) \*\/\s*@font-face\s*\{([^}]+)\}/g,
)) {
  const family = /font-family: '([^']+)'/.exec(match[2])?.[1];
  const url = /url\(([^)]+)\)/.exec(match[2])?.[1];
  if (!family || !url) throw Error("Unknown font face");
  const name = family.toLowerCase() + "-" + match[1] + ".woff2";
  const data = await fetch(url);
  if (!data.ok) throw Error("Font download failed");
  const buffer = Buffer.from(await data.arrayBuffer());
  await writeFile(dir + "/" + name, buffer);
  local +=
    "@font-face{" + match[2].replace(url, "/assets/fonts/" + name) + "}\n";
  audit.push({
    family,
    subset: match[1],
    file: name,
    source: url,
    bytes: buffer.length,
  });
}
if (audit.length !== 6) throw Error("Expected exactly six local font subsets");
for (const name of ["fraunces", "nunito", "caveat"]) {
  const url =
    "https://raw.githubusercontent.com/google/fonts/main/ofl/" +
    name +
    "/OFL.txt";
  const r = await fetch(url);
  const license = await r.text();
  if (!r.ok || !license.includes("SIL OPEN FONT LICENSE"))
    throw Error("Missing OFL");
  await writeFile(dir + "/" + name + "-OFL.txt", license);
}
await writeFile("src/fonts.css", local);
await writeFile(
  dir + "/audit.json",
  JSON.stringify(
    { cssSource: cssUrl, license: "SIL Open Font License 1.1", fonts: audit },
    null,
    2,
  ),
);
console.log(audit);
