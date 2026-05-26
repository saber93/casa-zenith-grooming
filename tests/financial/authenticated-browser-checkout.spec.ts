import { expect, test } from "@playwright/test";

import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, query } from "./helpers/supabaseTestClient";

test("authenticated product POS checkout and reports routes work", async ({ page }) => {
  const factory = new FinancialTestFactory(createRunId("auth-browser-checkout"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();
  await query(
    `
    INSERT INTO public.customers (business_id, full_name, phone, preferred_language, updated_at)
    VALUES ($1, 'Walk-in Product Customer', $2, 'en', now())
    `,
    [factory.businessId, `walkin-product-${factory.businessId}`],
  );
  await factory.openSession();

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("status of 401")) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  try {
    await page.addInitScript((slug) => {
      window.localStorage.setItem("casa.selectedBusinessSlug", slug);
    }, factory.runId);
    await page.goto("/login?redirect=%2Fadmin%2Fproduct-sales", { waitUntil: "networkidle" });
    await page.locator("#admin-email").fill(`${factory.runId}@example.test`);
    await page.locator("#admin-password").fill(factory.authPassword);
    await page.getByRole("button", { name: /sign in|login|دخول/i }).click();

    await page.waitForURL("**/admin/product-sales", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Product Sales|مبيعات المنتجات/i })).toBeVisible(
      {
        timeout: 30_000,
      },
    );

    await page
      .getByRole("button", { name: /Record Sale|تسجيل/i })
      .last()
      .click();
    await expect(page.locator("body")).toContainText(/completed|مكتمل/i, { timeout: 30_000 });

    const tx = await query<{
      receipt_number: string;
      cashier_session_id: string;
      payment_status: string;
    }>(
      `
      SELECT receipt_number, cashier_session_id, payment_status
      FROM public.checkout_transactions
      WHERE business_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [factory.businessId],
    );
    expect(tx.rows[0].receipt_number).toMatch(/^CASA-\d{8}-\d{6}$/);
    expect(tx.rows[0].cashier_session_id).toBeTruthy();
    expect(tx.rows[0].payment_status).toBe("completed");

    for (const route of [
      "/admin/reception",
      "/admin/bookings",
      "/admin/reports",
      "/admin/barber-workspace",
      "/ar/admin/reports",
    ]) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
    }

    await page.goto("/ar/admin/reports", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(consoleErrors).toEqual([]);
  } finally {
    await cleanupFinancialTest(factory);
  }
});
