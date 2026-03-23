/**
 * Takes an HD screenshot of the 3×3 template grid from the running preview server.
 * Usage: node lib/scripts/screenshotGrid.js
 * Requires: preview server running on localhost:4174
 */
import puppeteer from "puppeteer";
import path from "path";

const URL = "http://localhost:4174";
const OUT = path.resolve(__dirname, "../../preview/templates-grid.png");

async function main() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  // Set a wide viewport so the 3×3 grid renders at high quality
  await page.setViewport({ width: 1200, height: 2000, deviceScaleFactor: 3 });

  console.log(`Loading ${URL}...`);
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });

  // Wait for all 9 canvases to render (each template thumbnail)
  console.log("Waiting for all 9 templates to render...");
  await page.waitForFunction(
    () => document.querySelectorAll(".card canvas").length >= 9,
    { timeout: 60000 }
  );
  // Extra wait for canvas paint to finish
  await new Promise((r) => setTimeout(r, 3000));

  // Get the total content height (h1 top to grid bottom)
  const contentHeight = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const grid = document.getElementById("grid");
    if (!h1 || !grid) return 0;
    return grid.getBoundingClientRect().bottom;
  });

  if (!contentHeight) {
    console.error("Could not find content on page");
    await browser.close();
    process.exit(1);
  }

  // Full-width screenshot so left/right padding is perfectly symmetric
  const clip = { x: 0, y: 0, width: 1200, height: Math.ceil(contentHeight) + 20 };

  console.log(`Screenshotting ${clip.width}×${clip.height} area (×3 DPR)...`);
  await page.screenshot({ path: OUT, clip, type: "png" });

  await browser.close();
  console.log(`Done! Saved to: ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
