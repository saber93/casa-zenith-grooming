import { expect, test, type Page } from "@playwright/test";

import { closePool, createRunId } from "./helpers/uatTestClient";
import { UatDataFactory, type UatRole } from "./helpers/uatDataFactory";

test.describe.configure({ mode: "serial" });

const factory = new UatDataFactory(createRunId());

const signInAs = async (page: Page, role: UatRole, redirect = "/admin/business-settings") => {
  const user = factory.users[role];
  await page.addInitScript((slug) => {
    window.localStorage.setItem("casa.selectedBusinessSlug", slug);
  }, factory.runId);
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`, { waitUntil: "networkidle" });
  await page.locator("#admin-email").fill(user.email);
  await page.locator("#admin-password").fill(user.password);
  await page.getByRole("button", { name: /sign in|login|دخول/i }).click();
};

const expectRouteAccess = async (page: Page, path: string, expected: "allowed" | "denied") => {
  await page.goto(path, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  if (expected === "allowed") {
    expect(body).not.toMatch(/Access denied|غير مصرح|لا تملك صلاحية/);
  } else {
    expect(body).toMatch(/Access denied|غير مصرح|لا تملك صلاحية/);
  }
};

test.beforeAll(async () => {
  await factory.setup();
});

test.afterAll(async () => {
  await factory.cleanup();
  await closePool();
});

test("platform admin can manage businesses and see platform navigation", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await signInAs(page, "platform_admin", "/admin/businesses");
  await page.waitForURL("**/admin/businesses", { timeout: 30_000 });
  await expect(page.locator("body")).toContainText(/Businesses|المنشآت/);
  await expectRouteAccess(page, "/admin/businesses", "allowed");
  await expectRouteAccess(page, "/admin/business-settings", "allowed");
  expect(consoleErrors).toEqual([]);
});

test("business terminology changes across business types in one admin session", async ({
  page,
}) => {
  await signInAs(page, "platform_admin", "/admin/business-settings");
  await page.waitForURL("**/admin/business-settings", { timeout: 30_000 });

  await expect(page.locator("body")).toContainText("Therapist Workspace");
  await expect(page.locator("body")).not.toContainText("Barber Workspace");

  await page.getByRole("button", { name: /Casa UAT Demo Spa/i }).click();
  await page.getByRole("menuitem", { name: /Casa UAT Other Branch/i }).click();
  await expect(page.locator("body")).toContainText("Barber Workspace");

  await page.getByRole("button", { name: /Casa UAT Other Branch/i }).click();
  await page.getByRole("menuitem", { name: /Casa UAT Beauty Salon/i }).click();
  await expect(page.locator("body")).toContainText("Specialist Workspace");

  await page.goto("/ar/admin/business-settings", { waitUntil: "networkidle" });
  await expect(page.locator("body")).toContainText("مساحة المعالج");
});

test("business owner is business-scoped and cannot access platform business management", async ({
  page,
}) => {
  await signInAs(page, "business_owner", "/admin/business-settings");
  await page.waitForURL("**/admin/business-settings", { timeout: 30_000 });
  await expectRouteAccess(page, "/admin/business-settings", "allowed");
  await expectRouteAccess(page, "/admin/staff", "allowed");
  await expectRouteAccess(page, "/admin/reception", "allowed");
  await expectRouteAccess(page, "/admin/reports", "allowed");
  await expectRouteAccess(page, "/admin/businesses", "denied");
});

test("business admin can manage operational pages but not platform businesses", async ({
  page,
}) => {
  await signInAs(page, "business_admin", "/admin/reception");
  await page.waitForURL("**/admin/reception", { timeout: 30_000 });
  await expectRouteAccess(page, "/admin/reception", "allowed");
  await expectRouteAccess(page, "/admin/bookings", "allowed");
  await expectRouteAccess(page, "/admin/staff", "allowed");
  await expectRouteAccess(page, "/admin/businesses", "denied");
});

test("reception role is limited to reception, bookings, queue, and display", async ({ page }) => {
  await signInAs(page, "reception", "/admin/reception");
  await page.waitForURL("**/admin/reception", { timeout: 30_000 });
  await expectRouteAccess(page, "/admin/reception", "allowed");
  await expectRouteAccess(page, "/admin/bookings", "allowed");
  await expectRouteAccess(page, "/admin/queue", "allowed");
  await expectRouteAccess(page, "/admin/queue-display", "allowed");
  await expectRouteAccess(page, "/admin/reports", "denied");
  await expectRouteAccess(page, "/admin/staff", "denied");
});

test("cashier role can use reception/payment surfaces but not staff or businesses", async ({
  page,
}) => {
  await signInAs(page, "cashier", "/admin/product-sales");
  await page.waitForURL("**/admin/product-sales", { timeout: 30_000 });
  await expectRouteAccess(page, "/admin/product-sales", "allowed");
  await expectRouteAccess(page, "/admin/reports", "allowed");
  await expectRouteAccess(page, "/admin/reception", "allowed");
  await expectRouteAccess(page, "/admin/staff", "denied");
  await expectRouteAccess(page, "/admin/businesses", "denied");
});

test("barber role is locked to barber workspace and display", async ({ page }) => {
  await signInAs(page, "barber", "/admin/barber-workspace");
  await page.waitForURL("**/admin/barber-workspace", { timeout: 30_000 });
  await expectRouteAccess(page, "/admin/barber-workspace", "allowed");
  await expect(page.locator("body")).toContainText(/UAT Therapist|المعالج التجريبي/);
  await expect(page.locator('[data-testid="barber-workspace-selector"]')).toBeDisabled();
  await expectRouteAccess(page, "/admin/queue-display", "allowed");
  await expectRouteAccess(page, "/admin/reception", "denied");
  await expectRouteAccess(page, "/admin/reports", "denied");
});

test("viewer role is read-only and can only open queue display", async ({ page }) => {
  await signInAs(page, "viewer", "/admin/queue-display");
  await page.waitForURL("**/admin/queue-display", { timeout: 30_000 });
  await expectRouteAccess(page, "/admin/queue-display", "allowed");
  await expectRouteAccess(page, "/admin/reports", "denied");
  await expectRouteAccess(page, "/admin/reception", "denied");
});

test("public customer queue page remains available without authentication", async ({ page }) => {
  await page.goto("/queue", { waitUntil: "networkidle" });
  await expect(page.locator("body")).toContainText(/Join Queue|Queue|الانتظار/);
});
