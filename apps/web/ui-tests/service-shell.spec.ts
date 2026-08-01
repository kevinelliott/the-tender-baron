import { expect, test } from "@playwright/test";

test("desktop views share unchanged presentation state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only composition check");
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "One promise. Four plates." })).toBeVisible();
  await expect(page.getByTestId("service-theatre")).toBeVisible();
  const tick = await page.getByTestId("canonical-tick").textContent();

  await page.getByRole("button", { name: /Coal Table/ }).click();
  await expect(page.getByTestId("coal-table")).toBeVisible();
  await expect(page.getByText("Abstract heat paths · game units only")).toBeVisible();
  await expect(page.getByTestId("canonical-tick")).toHaveText(tick ?? "");

  await page.getByRole("button", { name: "Preview rake" }).click();
  await expect(page.getByRole("status")).toContainText("domain reducer is not connected");
  await expect(page.locator("body")).not.toContainText(/wallet|token|marketplace|blockchain/i);
});

test("mobile task planes remain reachable without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "390px-only composition check");
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Mobile task planes" });
  await expect(nav).toBeVisible();
  await expect(page.getByRole("region", { name: "Current service context" })).toContainText("Cover C · Ribeye");
  await nav.getByRole("button", { name: "Fire" }).click();
  await expect(page.getByTestId("coal-table")).toBeVisible();
  await nav.getByRole("button", { name: "Rest" }).click();
  await expect(page.getByTestId("rest-plane")).toBeVisible();
  await nav.getByRole("button", { name: "Pass" }).click();
  await expect(page.getByTestId("pass-plane")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("interactive targets and names meet the shell floor", async ({ page }) => {
  await page.goto("/");
  const unnamed = await page.locator("main button:visible").evaluateAll((buttons) => buttons.filter((button) => !button.getAttribute("aria-label") && !((button as HTMLElement).innerText ?? "").trim()).length);
  expect(unnamed).toBe(0);

  const undersized = await page.locator("main button:visible").evaluateAll((buttons) => buttons.filter((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  }).map((button) => ({ label: (button.textContent ?? button.getAttribute("aria-label") ?? "").trim(), rect: button.getBoundingClientRect().toJSON() })));
  expect(undersized).toEqual([]);
});
