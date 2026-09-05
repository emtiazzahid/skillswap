// Render every design/mockups/*.html to design/renders/<name>-{desktop,mobile}.png
import { chromium } from "playwright";
import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const mockDir = path.join(root, "design/mockups");
const outDir = path.join(root, "design/renders");
const only = process.argv[2];

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

const browser = await chromium.launch();
const files = (await readdir(mockDir)).filter((f) => f.endsWith(".html") && !f.startsWith("_") && (!only || f.includes(only)));

for (const file of files) {
  const name = file.replace(/\.html$/, "");
  for (const [label, vp] of Object.entries(viewports)) {
    if (name.includes("mobile") && label === "desktop") continue;
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(pathToFileURL(path.join(mockDir, file)).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(outDir, `${name}-${label}.png`);
    await page.screenshot({ path: out, fullPage: true });
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return [...document.querySelectorAll("body *")]
        .filter((el) => !el.closest(".tape, .pin, .sticker--corner, [data-overhang]"))
        .filter((el) => el.getBoundingClientRect().right > w + 1)
        .map((el) => el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""))
        .slice(0, 5);
    });
    console.log(`${name} ${label}: ${overflow.length ? "OVERFLOW: " + overflow.join(", ") : "ok"}${errors.length ? " console errors: " + errors.join(" | ") : ""}`);
    await page.close();
  }
}
await browser.close();
