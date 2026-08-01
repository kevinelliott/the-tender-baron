import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const DATABASE = "tender-baron-device-service-v1";
const SAVE_STORE = "saves";
const CURRENT_SAVE = "first-embers-current";
const GOLDEN_REPLAY = "cab1803abb7a67fca5c7a01963f512423412f4a554dd71a6dff12404c8889a6f";

async function waitForSaved(page: Page) {
  await expect(page.getByTestId("storage-state")).toHaveText("SAVED");
}

async function clickAction(page: Page, target: Locator) {
  const before = Number(await page.getByTestId("service-revision").textContent());
  await target.click();
  await expect.poll(async () => Number(await page.getByTestId("service-revision").textContent())).toBeGreaterThan(before);
}

async function openSetup(page: Page) {
  await page.goto("/");
  await waitForSaved(page);
  await clickAction(page, page.getByRole("button", { name: "Open the house" }).first());
  await expect(page.getByTestId("service-status")).toHaveText("BRIEFING");
  await clickAction(page, page.getByRole("button", { name: "Review the promise" }).first());
  await expect(page.getByTestId("service-status")).toHaveText("SETUP");
}

async function chooseView(page: Page, name: "Service Theatre" | "Coal Table" | "Active Rest" | "Whole-table Pass") {
  await page.getByRole("navigation", { name: "Service views" }).getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

async function chooseCover(page: Page, cover: "A" | "B" | "C" | "D") {
  await chooseView(page, "Service Theatre");
  await page.getByTestId(`cover-${cover}`).click();
}

async function prepareFourCuts(page: Page) {
  for (const cover of ["A", "B", "C", "D"] as const) {
    await chooseCover(page, cover);
    await chooseView(page, "Coal Table");
    await clickAction(page, page.getByTestId("cut-action"));
  }
  const placements = { A: "coal_a", B: "coal_e", C: "coal_b", D: "coal_f" } as const;
  for (const cover of ["A", "B", "C", "D"] as const) {
    await chooseCover(page, cover);
    await chooseView(page, "Coal Table");
    await page.getByTestId(`placement-${placements[cover]}`).click();
    await clickAction(page, page.getByTestId("cut-action"));
  }
  await expect(page.getByTestId("service-status")).toHaveText("OPEN");
}

async function sideAction(page: Page, sideName: string, action: "Start side" | "Plate side") {
  await chooseView(page, "Whole-table Pass");
  const row = page.locator(".pass-row").filter({ hasText: sideName });
  await clickAction(page, row.getByRole("button", { name: action }));
}

async function advanceToTick(page: Page, target: number) {
  const current = Number(await page.getByTestId("canonical-tick").textContent());
  expect(current).toBeLessThanOrEqual(target);
  await page.clock.fastForward((target - current) * 250);
  await expect(page.getByTestId("canonical-tick")).toHaveText(String(target));
}

async function moveToRest(page: Page, cover: "A" | "B" | "C" | "D") {
  await chooseCover(page, cover);
  await chooseView(page, "Active Rest");
  await clickAction(page, page.getByRole("button", { name: /Move to rest/ }));
}

async function carve(page: Page, cover: "A" | "B" | "C" | "D") {
  await chooseCover(page, cover);
  await chooseView(page, "Active Rest");
  await clickAction(page, page.getByRole("button", { name: /^Carve/ }));
}

async function moveCut(page: Page, cover: "A" | "B" | "C" | "D", placement: string) {
  await chooseCover(page, cover);
  await chooseView(page, "Coal Table");
  await page.getByTestId(`placement-${placement}`).click();
  await clickAction(page, page.getByTestId("move-cut"));
}

test("live monotonic cadence pauses in the background and resumes without catch-up", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop clock authority journey");
  await openSetup(page);
  await chooseView(page, "Coal Table");
  await clickAction(page, page.getByTestId("cut-action"));
  await clickAction(page, page.getByTestId("cut-action"));
  await expect.poll(async () => Number(await page.getByTestId("canonical-tick").textContent()), { timeout: 2_000 }).toBeGreaterThanOrEqual(4);

  const other = await context.newPage();
  await other.goto("/replay-proof");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("button", { name: "Resume service" })).toBeEnabled();
  const pausedTick = await page.getByTestId("canonical-tick").textContent();
  await page.waitForTimeout(800);
  await expect(page.getByTestId("canonical-tick")).toHaveText(pausedTick ?? "");

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await clickAction(page, page.getByRole("button", { name: "Resume service" }));
  await expect.poll(async () => Number(await page.getByTestId("canonical-tick").textContent()), { timeout: 1_500 }).toBeGreaterThan(Number(pausedTick));
});

test("rake selection changes clear the bound preview and only exact intent applies", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop preview integrity journey");
  await openSetup(page);
  await chooseView(page, "Coal Table");
  await page.getByTestId("rake-action").click();
  await expect(page.getByTestId("rake-action")).toHaveText("Apply inspected rake");
  await page.getByTestId("placement-coal_f").click();
  await expect(page.getByTestId("rake-action")).toHaveText("Preview rake");
  await expect(page.getByTestId("service-notice")).toContainText("Preview its exact rake path");
  await page.getByTestId("rake-action").click();
  const before = Number(await page.getByTestId("service-revision").textContent());
  await page.getByTestId("rake-action").click();
  await expect.poll(async () => Number(await page.getByTestId("service-revision").textContent())).toBe(before + 1);
  await expect(page.getByTestId("service-notice")).toContainText("coal:");
});

test("two tabs cannot overwrite one another and the losing tab gets an explicit fork flow", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop multi-writer journey");
  await page.goto("/");
  await waitForSaved(page);
  const second = await context.newPage();
  await second.goto("/");
  await waitForSaved(second);

  await clickAction(page, page.getByRole("button", { name: "Open the house" }).first());
  await second.getByRole("button", { name: "Open the house" }).first().click();
  await expect(second.getByRole("alert", { name: "Another tab moved this service forward" })).toBeVisible();
  await expect(second.getByTestId("storage-state")).toHaveText("CONFLICT");
  await second.getByRole("button", { name: "Fork this tab" }).click();
  await expect(second.getByTestId("storage-state")).toHaveText("SAVED");
  await expect(second.locator(".save-book strong")).toContainText("conflict-fork-");

  await page.reload();
  await waitForSaved(page);
  await expect(page.getByTestId("service-status")).toHaveText("BRIEFING");
});

test("storage-unavailable mode really plays in memory and truthfully resets on reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop unavailable-storage journey");
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
  });
  await page.goto("/");
  await expect(page.getByTestId("storage-state")).toHaveText("MEMORY ONLY");
  await clickAction(page, page.getByRole("button", { name: "Open the house" }).first());
  await expect(page.getByTestId("service-status")).toHaveText("BRIEFING");
  await expect(page.getByTestId("service-notice")).toContainText("Held in this tab");
  await page.reload();
  await expect(page.getByTestId("storage-state")).toHaveText("MEMORY ONLY");
  await expect(page.getByTestId("service-status")).toHaveText("DORMANT");
});

test("corrupt current storage is quarantined and the verified backup resumes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop storage-recovery journey");
  await page.goto("/");
  await waitForSaved(page);
  await clickAction(page, page.getByRole("button", { name: "Open the house" }).first());

  await page.evaluate(async ({ databaseName, storeName, saveId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put({ id: saveId, payload: "{corrupt", savedAt: Date.now() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, { databaseName: DATABASE, storeName: SAVE_STORE, saveId: CURRENT_SAVE });

  await page.reload();
  await expect(page.getByRole("alert", { name: "The latest save was set aside" })).toBeVisible();
  await expect(page.getByTestId("storage-state")).toHaveText("RECOVERED");
  await expect(page.getByTestId("service-status")).toHaveText("DORMANT");
});

test("export, import, fork, and delete preserve explicit local lifecycle choices", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop save lifecycle journey");
  await page.goto("/");
  await waitForSaved(page);
  await clickAction(page, page.getByRole("button", { name: "Open the house" }).first());
  await page.getByText("Device save book").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export verified save" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  await page.getByRole("button", { name: "Fork this history" }).click();
  await expect(page.locator(".save-book strong")).toContainText("-fork-");
  await page.getByLabel("Choose a Tender Baron save to import").setInputFiles(downloadPath!);
  await expect(page.locator(".save-book strong")).toContainText("first-embers-import-");
  await page.getByRole("button", { name: "Delete local save" }).click();
  await page.getByRole("button", { name: "Confirm delete local save" }).click();
  await expect(page.locator(".save-book strong")).toHaveText(CURRENT_SAVE);
  await expect(page.getByTestId("service-status")).toHaveText("BRIEFING");
  await waitForSaved(page);
});

test("the authored first service reaches a truthful missing-side recovery settlement", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop complete-service recovery journey");
  const fixedTime = new Date("2026-08-01T00:00:00Z");
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await openSetup(page);
  await prepareFourCuts(page);
  await sideAction(page, "Ember shallot", "Start side");
  await sideAction(page, "Creamed greens", "Start side");

  await advanceToTick(page, 16);
  await chooseView(page, "Service Theatre");
  await clickAction(page, page.getByRole("button", { name: "Acknowledge" }));
  await advanceToTick(page, 30);
  await moveToRest(page, "A");
  await moveCut(page, "C", "coal_a");

  await advanceToTick(page, 32);
  await sideAction(page, "Ember shallot", "Plate side");
  await sideAction(page, "Creamed greens", "Plate side");
  await sideAction(page, "Smoked potato", "Start side");
  await sideAction(page, "Brass-pan mushrooms", "Start side");

  await advanceToTick(page, 34);
  await moveToRest(page, "D");
  await advanceToTick(page, 48);
  await moveCut(page, "B", "coal_b");
  await advanceToTick(page, 56);
  await sideAction(page, "Brass-pan mushrooms", "Plate side");

  await advanceToTick(page, 68);
  await carve(page, "A");
  await carve(page, "D");
  await moveToRest(page, "B");
  await moveToRest(page, "C");
  await advanceToTick(page, 94);
  await carve(page, "B");
  await advanceToTick(page, 98);
  await carve(page, "C");

  await chooseView(page, "Whole-table Pass");
  await clickAction(page, page.getByRole("button", { name: /Offer a shared course/i }));
  await clickAction(page, page.getByRole("button", { name: /Call the table/ }).last());
  await expect(page.getByTestId("service-status")).toHaveText("CLOSING");
  await clickAction(page, page.getByRole("button", { name: /Close ledger/ }).last());
  await expect(page.getByTestId("service-status")).toHaveText("SETTLED");
  await expect(page.getByText("10,440 house cents")).toBeVisible();
});

test("move, baste, defer, and authored at-risk recovery remain player choices", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop recovery controls journey");
  const fixedTime = new Date("2026-08-01T00:00:00Z");
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await openSetup(page);
  await chooseView(page, "Coal Table");
  await clickAction(page, page.getByTestId("cut-action"));
  await clickAction(page, page.getByTestId("cut-action"));
  await clickAction(page, page.getByTestId("baste-cut"));
  await page.getByTestId("placement-coal_b").click();
  await clickAction(page, page.getByTestId("move-cut"));
  await advanceToTick(page, 16);
  await clickAction(page, page.getByRole("button", { name: "Defer deliberately" }));
  await expect(page.locator(".attention-note > span")).toHaveText("DEFERRED");
  await clickAction(page, page.getByRole("button", { name: "Acknowledge" }));
  await chooseView(page, "Coal Table");
  await page.getByTestId("placement-coal_a").click();
  await clickAction(page, page.getByTestId("move-cut"));
  const recovery = page.getByText("needs a recovery");
  for (let tick = 0; tick < 200 && !(await recovery.isVisible()); tick += 1) {
    await page.clock.fastForward(250);
  }
  await expect(recovery).toBeVisible();
  await expect(page.getByRole("button", { name: /Move to holding heat/ })).toBeEnabled();
  await clickAction(page, page.getByRole("button", { name: /Move to holding heat/ }));
});

test("browser bundle reproduces the Node golden replay bytes", async ({ page }) => {
  await page.goto("/replay-proof");
  await expect(page.getByTestId("proof-status")).toHaveText("SETTLED");
  await expect(page.getByTestId("proof-replay-digest")).toHaveText(GOLDEN_REPLAY);
  await expect(page.getByTestId("proof-equivalence")).toHaveText("Browser bytes match the Node golden replay");
});

test("mobile task planes drive one live session without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "touch-sized task-plane journey");
  await page.goto("/");
  await waitForSaved(page);
  const nav = page.getByRole("navigation", { name: "Mobile task planes" });
  for (const [name, testId] of [["Fire", "coal-table"], ["Rest", "rest-plane"], ["Pass", "pass-plane"], ["Room", "service-theatre"]] as const) {
    const tick = await page.getByTestId("canonical-tick").textContent();
    await nav.getByRole("button", { name }).click();
    await expect(page.getByTestId(testId)).toBeVisible();
    await expect(page.getByTestId("canonical-tick")).toHaveText(tick ?? "");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("responsive matrix and 200 percent text zoom preserve the complete task path", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "single-browser responsive matrix");
  for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 768, height: 900 }, { width: 1024, height: 900 }, { width: 1440, height: 960 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await waitForSaved(page);
    await expect(page.locator("h1")).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${viewport.width}px horizontal overflow`).toBeLessThanOrEqual(0);
  }
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect(page.getByRole("button", { name: "Open the house" }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("keyboard-only service uses natural tab order for real actions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop keyboard-only journey");
  await page.goto("/");
  await waitForSaved(page);

  async function pressControl(name: RegExp, changesRevision = false) {
    await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
    for (let index = 0; index < 80; index += 1) {
      if (index > 0 || (await page.evaluate(() => document.activeElement === document.body))) {
        await page.keyboard.press("Tab");
      }
      const focused = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        return {
          label: active?.getAttribute("aria-label") ?? active?.innerText ?? "",
          disabled: active instanceof HTMLButtonElement && active.disabled,
          tagName: active?.tagName ?? "",
          className: active?.className ?? "",
        };
      });
      if (focused.tagName === "BUTTON" && name.test(focused.label.trim()) && !focused.disabled) {
        const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineWidth);
        expect(Number.parseFloat(outline)).toBeGreaterThanOrEqual(2);
        const before = Number(await page.getByTestId("service-revision").textContent());
        await page.keyboard.press("Enter");
        if (changesRevision) {
          await expect.poll(async () => Number(await page.getByTestId("service-revision").textContent())).toBeGreaterThan(before);
          await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
        }
        return;
      }
    }
    throw new Error(`Keyboard could not reach ${name}`);
  }

  await pressControl(/Open the house/, true);
  await expect(page.getByTestId("service-status")).toHaveText("BRIEFING");
  await pressControl(/Review the promise/, true);
  await expect(page.getByTestId("service-status")).toHaveText("SETUP");
  await pressControl(/^Coal Table/);
  await expect(page.getByTestId("coal-table")).toBeVisible();
  await pressControl(/^Select cut$/, true);
  await expect(page.getByTestId("cut-action")).toHaveText("Place cut");
});

test("reduced motion, forced colors, names, targets, and serious accessibility scan pass", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto("/");
  await waitForSaved(page);
  await page.getByRole("button", { name: "Reduce motion" }).click();
  await expect(page.locator("main")).toHaveClass(/reduce-motion/);
  const animated = await page.locator("main *").evaluateAll((nodes) => nodes.filter((node) => {
    const style = getComputedStyle(node);
    return Number.parseFloat(style.animationDuration) > 0.01 || Number.parseFloat(style.transitionDuration) > 0.01;
  }).length);
  expect(animated).toBe(0);

  const unnamed = await page.locator("main button:visible").evaluateAll((buttons) => buttons.filter((button) => !button.getAttribute("aria-label") && !((button as HTMLElement).innerText ?? "").trim()).length);
  expect(unnamed).toBe(0);
  const undersized = await page.locator("main button:visible").evaluateAll((buttons) => buttons.filter((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  }).map((button) => ({ label: (button.textContent ?? button.getAttribute("aria-label") ?? "").trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  expect(undersized).toEqual([]);

  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });
  const results = await new AxeBuilder({ page }).include("main").analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  await expect(page.locator("body")).not.toContainText(/wallet|token|marketplace|blockchain|chain/i);
});
