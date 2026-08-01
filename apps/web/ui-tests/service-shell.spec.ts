import { expect, test } from "@playwright/test";

const DATABASE = "tender-baron-device-service-v1";
const SAVE_STORE = "saves";
const CURRENT_SAVE = "first-embers-current";

async function waitForSaved(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("storage-state")).toHaveText("SAVED");
}

test("live reducer state survives view switches and a full reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop live-session journey");
  await page.goto("/");
  await waitForSaved(page);
  await expect(page.getByTestId("service-status")).toHaveText("DORMANT");

  await page.getByRole("button", { name: "Open the house" }).click();
  await waitForSaved(page);
  await expect(page.getByTestId("service-status")).toHaveText("BRIEFING");

  await page.reload();
  await waitForSaved(page);
  await expect(page.getByTestId("service-status")).toHaveText("BRIEFING");
  await expect(page.getByRole("status")).toContainText("Verified local service resumed");

  await page.getByRole("button", { name: "Review the promise" }).click();
  await waitForSaved(page);
  await page.getByRole("button", { name: /Coal Table/ }).click();
  const tickBefore = await page.getByTestId("canonical-tick").textContent();
  await expect(page.getByTestId("coal-table")).toBeVisible();
  await expect(page.getByTestId("canonical-tick")).toHaveText(tickBefore ?? "");

  await page.getByRole("button", { name: "Select cut" }).click();
  await page.getByRole("button", { name: "Place cut" }).click();
  await expect(page.getByTestId("service-status")).toHaveText("OPEN");
  await page.getByRole("button", { name: "Advance one canonical tick" }).click();
  await expect(page.getByTestId("canonical-tick")).toHaveText("1");

  await page.getByTestId("coal-table").getByRole("button", { name: "Read the room" }).click();
  await expect(page.getByTestId("service-theatre")).toBeVisible();
  await expect(page.getByTestId("canonical-tick")).toHaveText("1");
  await page.reload();
  await expect(page.getByTestId("canonical-tick")).toHaveText("1");
  await expect(page.getByTestId("service-status")).toHaveText("OPEN");
});

test("corrupt current storage is quarantined and the verified backup resumes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop storage-recovery journey");
  await page.goto("/");
  await waitForSaved(page);
  await page.getByRole("button", { name: "Open the house" }).click();
  await waitForSaved(page);

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
  const recoveryAlert = page.getByRole("alert", { name: "The latest save was set aside" });
  await expect(recoveryAlert).toContainText("latest save was set aside");
  await expect(page.getByTestId("storage-state")).toHaveText("RECOVERED");
  await expect(page.getByTestId("service-status")).toHaveText("DORMANT");
  await expect(recoveryAlert.getByRole("button", { name: "Continue verified service" })).toBeVisible();
});

test("mobile task planes drive the same live session without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "touch-sized task-plane journey");
  await page.goto("/");
  await waitForSaved(page);
  const nav = page.getByRole("navigation", { name: "Mobile task planes" });
  await expect(nav).toBeVisible();

  for (const [name, testId] of [["Fire", "coal-table"], ["Rest", "rest-plane"], ["Pass", "pass-plane"], ["Room", "service-theatre"]] as const) {
    const tick = await page.getByTestId("canonical-tick").textContent();
    await nav.getByRole("button", { name }).click();
    await expect(page.getByTestId(testId)).toBeVisible();
    await expect(page.getByTestId("canonical-tick")).toHaveText(tick ?? "");
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("responsive matrix preserves the task path from 320 through 1440", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "single-browser responsive matrix");
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 960 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await waitForSaved(page);
    await expect(page.locator("h1")).toBeAttached();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${viewport.width}px horizontal overflow`).toBeLessThanOrEqual(0);
  }
});

test("200 percent zoom retains controls and avoids horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop zoom journey");
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto("/");
  await waitForSaved(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("button", { name: "Open the house" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("keyboard-only operation exposes visible focus and changes task plane", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop keyboard journey");
  await page.goto("/");
  await waitForSaved(page);
  const coalButton = page.getByRole("button", { name: /Coal Table/ });
  await coalButton.focus();
  const focusStyle = await coalButton.evaluate((button) => {
    const style = getComputedStyle(button);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("coal-table")).toBeVisible();
});

test("reduced motion and forced colors retain functional equivalents", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "Service Theatre" })).toBeVisible();
});

test("visible application controls have names and minimum 44 pixel targets", async ({ page }) => {
  await page.goto("/");
  await waitForSaved(page);
  const unnamed = await page.locator("main button:visible").evaluateAll((buttons) => buttons.filter((button) => !button.getAttribute("aria-label") && !((button as HTMLElement).innerText ?? "").trim()).length);
  expect(unnamed).toBe(0);

  const undersized = await page.locator("main button:visible").evaluateAll((buttons) => buttons.filter((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  }).map((button) => ({ label: (button.textContent ?? button.getAttribute("aria-label") ?? "").trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  expect(undersized).toEqual([]);
});

test("automated accessibility audit finds named landmarks, unique ids, and valid button state", async ({ page }) => {
  await page.goto("/");
  await waitForSaved(page);
  const findings = await page.evaluate(() => {
    const issues: string[] = [];
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map((node) => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) issues.push(`duplicate ids: ${duplicates.join(", ")}`);
    if (document.querySelector("main") === null) issues.push("missing main landmark");
    if (document.querySelector("h1") === null) issues.push("missing h1");
    for (const button of document.querySelectorAll<HTMLButtonElement>("button")) {
      const name = button.getAttribute("aria-label")?.trim() || button.textContent?.trim();
      if (!name) issues.push("unnamed button");
      const pressed = button.getAttribute("aria-pressed");
      if (pressed !== null && pressed !== "true" && pressed !== "false") issues.push(`invalid aria-pressed: ${pressed}`);
    }
    for (const nav of document.querySelectorAll("nav")) {
      if (!nav.getAttribute("aria-label") && !nav.getAttribute("aria-labelledby")) issues.push("unnamed navigation");
    }
    return issues;
  });
  expect(findings).toEqual([]);
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("body")).not.toContainText(/wallet|token|marketplace|blockchain|chain/i);
});
