import { expect, test } from "@playwright/test";

const routes = [
  "/admin/reception",
  "/admin/bookings",
  "/admin/product-sales",
  "/admin/reports",
  "/admin/barber-workspace",
  "/ar/admin/reports",
];

test("financial admin routes render without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("status of 401")) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  }

  await page.goto("/ar/admin/reports", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("body")).not.toContainText(/555-|Financial QA Customer/i);

  expect(consoleErrors).toEqual([]);
});
