import { expect, test } from "@playwright/test";

import { reportTotals } from "./helpers/assertions";
import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, query } from "./helpers/supabaseTestClient";

test("split payments persist and cash contributes to cashier expected cash only", async () => {
  const factory = new FinancialTestFactory(createRunId("split-payment"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();
  await factory.openSession(0);

  try {
    const bookingId = await factory.createBooking("split");
    const tx = await factory.authedCheckout({
      bookingId,
      services: factory.serviceItems(),
      payments: factory.payments([
        { method: "cash", amount: 40 },
        { method: "card", amount: 50 },
        { method: "transfer", amount: 10 },
      ]),
      label: "split",
    });
    expect(tx.total_amount).toBe(100);

    const stored = await query<{ payments: unknown; total_amount: string }>(
      "SELECT payments, total_amount FROM public.checkout_transactions WHERE id = $1",
      [tx.transaction_id],
    );
    expect(stored.rows[0].payments).toEqual([
      { method: "cash", amount: 40 },
      { method: "card", amount: 50 },
      { method: "transfer", amount: 10 },
    ]);

    const totals = await reportTotals(factory.businessId);
    expect(Number(totals.cash_payments)).toBe(40);
    expect(Number(totals.card_payments)).toBe(50);
    expect(Number(totals.transfer_payments)).toBe(10);

    const closed = await factory.closeSession(40);
    expect(Number(closed.expected_cash)).toBe(40);
  } finally {
    await cleanupFinancialTest(factory);
  }
});
