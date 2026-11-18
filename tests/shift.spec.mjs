// Replays the Film Society shift in headless Chromium.
//   node shift.spec.mjs             -> changed app (expects the failures to be blocked)
//   node shift.spec.mjs --original  -> upstream app (expects the failures to happen)
//   add --shots to save screenshots into ../docs
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASE = "aeeba261b362fd08fe4084ece7bc5a02c49e5844"; // upstream commit before my change
const original = process.argv.includes("--original");
const shots = process.argv.includes("--shots");
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let dir = repo;
if (original) {
  dir = mkdtempSync(join(tmpdir(), "campus-original-"));
  for (const f of ["index.html", "app.js", "styles.css"])
    writeFileSync(join(dir, f), execSync(`git show ${BASE}:${f}`, { cwd: repo }));
}
const url = pathToFileURL(join(dir, "index.html")).href;
let failed = 0;
const check = (ok, msg) => {
  console.log((ok ? "PASS " : "FAIL ") + msg);
  if (!ok) failed++;
};

const browser = await chromium.launch().catch(() => chromium.launch({ channel: "msedge" }));
for (const width of [1100, 390]) {
  console.log(`\n== ${original ? "original" : "changed"} app at ${width}px ==`);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const status = () => page.locator("[data-status]").innerText();
  const tab = (n) => page.click(`nav [data-val="${n}"]`);
  const shot = async (name) => {
    if (!shots || width !== 1100) return;
    mkdirSync(join(repo, "docs"), { recursive: true });
    await page.locator("#campus-stores").screenshot({ path: join(repo, "docs", name) });
  };
  const issue = async (asset, who = "Kabir Sen") => {
    await tab("Loan register");
    await page.click('[data-action="new"]');
    await page.selectOption('[name="req"]', "RQ-214");
    await page.selectOption('[name="asset"]', asset);
    await page.selectOption('[name="who"]', who);
    await page.selectOption('[name="due"]', "Fri 8 pm");
    await page.click('[data-issue] [type="submit"]');
  };
  const slipOpen = async (num) => {
    await tab("Loan register");
    return (await page.locator(`[data-action="return"][data-val="${num}"]`).count()) === 1;
  };
  const shelfStatus = async (id) => {
    await tab("Inventory");
    return page.locator(".row", { hasText: id + " ·" }).locator(".tag").innerText();
  };
  const returnRow = async (num, labelText, by) => {
    await tab("Loan register");
    await page.click(`[data-action="return"][data-val="${num}"]`);
    if (original) return; // one click closes the slip
    await page.fill('[data-checkin] [name="label"]', labelText);
    await page.selectOption('[data-checkin] [name="by"]', by);
    await page.click('[data-checkin] [type="submit"]');
  };

  // Fri 3:45 pm: pickup
  await issue("PR-04");
  await issue("SP-02");
  await issue("AD-12");
  // Guardrail kept: a second adapter for the same request is blocked.
  await issue("AD-15");
  check(/approved quantity/.test(await status()), "pickup: second adapter for RQ-214 is blocked");
  await page.click('[data-action="cancel"]');

  // Fri 7:30 pm: partial return (L-402 projector, L-403 speaker)
  await page.click('[data-action="advance"]');
  await returnRow(402, "PR-04", "Kabir Sen");
  await returnRow(403, "sp 2", "Kabir Sen");
  if (!original)
    check(/RQ-214 still out: AD-12 with Kabir Sen/.test(await status()), "return: status says what RQ-214 still has out");

  // Sat 9 am: Leela brings "an adapter". Here it is her own, unlabelled one.
  await page.click('[data-action="advance"]');
  await shot(original ? "before-1-morning.png" : "after-1-morning.png");
  await returnRow(404, "", "Leela Das");
  if (original) {
    check(!(await slipOpen(404)), "ORIGINAL: one click closed L-404 without checking the adapter on the counter");
    check((await shelfStatus("AD-12")) === "On shelf", "ORIGINAL: AD-12 now shows On shelf although nobody returned it");
    await tab("Loan register");
    await page.click('[data-action="new"]');
    check((await page.locator('[name="asset"] option[value="AD-12"]').count()) === 1, "ORIGINAL: AD-12 can be issued to the next club");
    await page.click('[data-action="cancel"]');
    await tab("Inventory");
    await shot("before-2-ad12-on-shelf.png");
    // Wrong row: Tara's mic slip sits right next to the adapter slip.
    await returnRow(401, "", "");
    check(!(await slipOpen(401)) && (await shelfStatus("MI-09")) === "On shelf", "ORIGINAL: a misclick on Tara's row marks her mic as back");
  } else {
    check(await slipOpen(404), "unlabelled adapter: L-404 stays open");
    await page.fill('[data-checkin] [name="label"]', "AD-15");
    await page.click('[data-checkin] [type="submit"]');
    const err = await page.locator(".formerror").innerText();
    check(/AD-15 is not on loan/.test(err) && /L-404 for AD-12/.test(err), "wrong desk unit: AD-15 refused and points to L-404 / AD-12");
    check(await page.locator('[data-checkin] [name="label"]').evaluate((e) => e === document.activeElement), "focus returns to the label field");
    await shot("after-2-wrong-unit.png");
    check(await slipOpen(404) && (await shelfStatus("AD-12")) === "On loan", "AD-12 still shows On loan");
    // Right unit, typed the way a tired worker types it.
    await returnRow(401, "ad12", "Leela Das"); // started from Tara's row by mistake
    check(/AD-12 checked in from Leela Das \(collected by Kabir Sen\)/.test(await status()), "right unit closes L-404 and records the handoff");
    check(await slipOpen(401), "misclick on Tara's row did not close her mic slip");
    await tab("Loan register");
    await page.click('[data-action="scope"][data-val="1"]');
    check(/Returned Saturday · 9:00 am by Leela Das/.test(await page.locator(".page").innerText()), "closed slip shows when and from whom");
    await shot("after-3-closed.png");
    // Persistence: reload keeps the shift; v1 saves migrate.
    await page.reload();
    check(/Returned Saturday · 9:00 am by Leela Das/.test(await page.locator(".page").innerText()), "reload keeps the check-in record");
    await page.evaluate(() => localStorage.setItem("campus-stores.shift.v1", JSON.stringify({ version: 1, tab: "Loan register", phase: 2, selected: "", filter: "All items", loans: [{ num: 401, req: "RQ-209", asset: "MI-09", who: "Tara Shah", due: "Sat 10 am", back: false }, { num: 402, req: "RQ-214", asset: "AD-12", who: "Kabir Sen", due: "Fri 8 pm", back: false }], notes: [], editing: false, onlyOpen: true, notice: "x" })));
    await page.reload();
    check(await slipOpen(402), "a version 1 save restores and can be checked in");
  }
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
