import { expect, test } from "@playwright/test";

import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, expectDbFailure, withAuth } from "./helpers/supabaseTestClient";

test("cashier session gates committed checkout and reconciles cash", async () => {
  const factory = new FinancialTestFactory(createRunId("cashier-session"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();

  try {
    const preview = await withAuth(factory.authUserId, (client) =>
      factory.checkout(client, {
        action: "preview",
        services: factory.serviceItems(),
        payments: factory.payments([{ method: "cash", amount: 100 }]),
        label: "preview-no-session",
      }),
    );
    expect(preview.total_amount).toBe(100);

    const bookingId = await factory.createBooking("blocked-without-session");
    const blocked = await expectDbFailure(
      () =>
        factory.authedCheckout({
          bookingId,
          services: factory.serviceItems(),
          payments: factory.payments([{ method: "cash", amount: 100 }]),
          label: "blocked-without-session",
        }),
      /No active cashier session/,
    );
    expect(blocked.passed).toBe(true);

    await factory.openSession(10);
    const active = await factory.activeSession();
    expect(active).toBeTruthy();

    const tx = await factory.authedCheckout({
      bookingId,
      services: factory.serviceItems(),
      payments: factory.payments([{ method: "cash", amount: 100 }]),
      label: "cash-checkout",
    });
    expect(tx.cashier_session_id).toBeTruthy();

    const closed = await factory.closeSession(130);
    expect(Number(closed.expected_cash)).toBe(110);
    expect(Number(closed.actual_cash)).toBe(130);
    expect(Number(closed.variance)).toBe(20);

    const inactive = await factory.activeSession();
    expect(inactive?.active).toBe(false);
  } finally {
    await cleanupFinancialTest(factory);
  }
});
