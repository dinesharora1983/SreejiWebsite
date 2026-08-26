import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();
const serverBaseUrl = process.env.TEST_BASE_URL?.replace(/\/$/, "");
const pages = ["index.html", "vms.html", "qims.html", "ehs.html"];
const blockedBrandPattern = new RegExp(["A", "C", "M", "E"].join(""), "i");
const viewports = [
  { name: "wide", width: 1920, height: 1080 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 320, height: 568 },
];

await fs.mkdir(path.join(root, "artifacts"), { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const pageName of pages) {
      const url = serverBaseUrl
        ? `${serverBaseUrl}/${pageName === "index.html" ? "" : pageName}`
        : pathToFileURL(path.join(root, pageName)).toString();
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.goto(url, { waitUntil: "networkidle" });

      const title = await page.title();
      if (!title.includes("Sreeji Information Systems") && !title.includes("QIMS") && !title.includes("VMS") && !title.includes("EHS")) {
        throw new Error(`Unexpected title for ${pageName} ${viewport.name}: ${title}`);
      }

      const bodyText = await page.locator("body").innerText();
      if (blockedBrandPattern.test(bodyText)) {
        throw new Error(`Unexpected legacy product brand text found in ${pageName} ${viewport.name} DOM`);
      }

      const legacyEmailLinks = await page.locator('a[href^="mailto:hr@sreejiinfosys.com"]').count();
      if (legacyEmailLinks) {
        throw new Error(`Legacy contact email found in ${pageName} ${viewport.name}`);
      }

      const unnamedImages = await page.locator("img:not([alt])").count();
      if (unnamedImages) {
        throw new Error(`${pageName} ${viewport.name} contains images without alt attributes`);
      }

      const activeTheme = await page.locator('link[rel="stylesheet"][href="sreeji-business-v2.css"]').count();
      if (activeTheme !== 1) {
        throw new Error(`${pageName} ${viewport.name} is not using the versioned Sreeji business theme`);
      }

      if (pageName === "index.html") {
        const productScreenshots = await page.locator('img[src*="assets/screenshots"]').count();
        if (productScreenshots) {
          throw new Error(`Homepage contains ${productScreenshots} product screenshot references`);
        }

        const requiredOfferings = [
          "#ai-automation",
          "#workflow-management",
          "#integration",
          "#digital-engineering",
          "#it-enablement",
        ];
        for (const selector of requiredOfferings) {
          if ((await page.locator(selector).count()) !== 1) {
            throw new Error(`Homepage is missing required offering ${selector}`);
          }
        }

        const nextSectionContentTop = await page.locator("#about .eyebrow").evaluate((element) => element.getBoundingClientRect().top);
        if (nextSectionContentTop >= viewport.height) {
          throw new Error(`Homepage hero does not reveal the next section content in ${viewport.name}`);
        }

        const heroPosition = await page.locator(".hero-visual").evaluate((element) => getComputedStyle(element).position);
        if (heroPosition !== "absolute") {
          throw new Error(`Homepage theme did not style the hero visual in ${viewport.name}`);
        }

        if (viewport.width >= 1200) {
          const navDisplay = await page.locator("#primary-navigation").evaluate((element) => getComputedStyle(element).display);
          if (navDisplay !== "flex") {
            throw new Error(`Desktop navigation is not visible in ${viewport.name}`);
          }
        }
      }

      if (viewport.width < 1200) {
        const navToggle = page.locator(".mobile-nav-toggle");
        await navToggle.click();
        if ((await navToggle.getAttribute("aria-expanded")) !== "true") {
          throw new Error(`${pageName} ${viewport.name} mobile navigation did not open accessibly`);
        }
        await page.keyboard.press("Escape");
        if ((await navToggle.getAttribute("aria-expanded")) !== "false") {
          throw new Error(`${pageName} ${viewport.name} mobile navigation did not close with Escape`);
        }
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 2) {
        throw new Error(`${pageName} ${viewport.name} has horizontal overflow of ${overflow}px`);
      }

      await page.evaluate(async () => {
        const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
        for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => window.setTimeout(resolve, 80));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle");

      const unloadedImages = await page.locator("img").evaluateAll((images) =>
        images
          .filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
          .map((image) => image.getAttribute("src"))
      );
      if (unloadedImages.length) {
        throw new Error(`Images failed to load in ${pageName} ${viewport.name}: ${unloadedImages.join(", ")}`);
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      const shotName = `${pageName.replace(".html", "")}-${viewport.name}-verification.png`;
      await page.screenshot({ path: `artifacts/${shotName}`, fullPage: true });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log("Smoke check passed for all pages across five responsive viewports.");
