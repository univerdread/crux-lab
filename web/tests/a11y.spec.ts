import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Accessibility pass: axe-core (WCAG 2.1 A/AA rules) on every page; serious/critical violations fail.
const DATA = fileURLToPath(new URL("../public/data/", import.meta.url));
const index = JSON.parse(fs.readFileSync(`${DATA}index.json`, "utf8")) as { runs: { run_id: string }[] };
const briefs = JSON.parse(fs.readFileSync(`${DATA}briefs.json`, "utf8")) as { id: string }[];
const run = JSON.parse(fs.readFileSync(`${DATA}runs/${index.runs[0].run_id}.json`, "utf8")) as { trials: { id: string }[] };

const PAGES = ["/", "/briefs", `/brief/${briefs[0].id}`, `/lab/${index.runs[0].run_id}`,
  `/trial/${run.trials[0].id}`, "/atlas", "/results", "/about"];

for (const url of PAGES) {
  test(`a11y ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState("networkidle");
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude(".react-flow__attribution").analyze();
    const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const report = bad.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(report, `axe violations on ${url}`).toEqual([]);
  });
}
