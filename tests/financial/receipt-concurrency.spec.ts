import { expect, test } from "@playwright/test";

import { expectSequentialReceipts } from "./helpers/assertions";
import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, query, withAuth } from "./helpers/supabaseTestClient";

test("20 parallel checkouts get unique sequential receipts", async () => {
  const factory = new FinancialTestFactory(createRunId("receipt-concurrency"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();
  await factory.openSession();

  try {
    const bookings = await Promise.all(
      Array.from({ length: 20 }, (_, index) => factory.createBooking(`parallel-${index}`)),
    );
    const results = await Promise.all(
      bookings.map((bookingId, index) =>
        withAuth(factory.authUserId, (client) =>
          factory.checkout(client, {
            bookingId,
            services: factory.serviceItems(),
            payments: factory.payments([{ method: "card", amount: 100 }]),
            label: `parallel-${index}`,
          }),
        ),
      ),
    );

    const receipts = results.map((result) => result.receipt_number);
    expect(results).toHaveLength(20);
    expectSequentialReceipts(receipts);
    expect(results.every((result) => Boolean(result.cashier_session_id))).toBe(true);

    const ledger = await query<{ count: string }>(
      "SELECT count(*) FROM public.financial_ledger_entries WHERE business_id = $1",
      [factory.businessId],
    );
    expect(Number(ledger.rows[0].count)).toBeGreaterThanOrEqual(20);
  } finally {
    await cleanupFinancialTest(factory);
  }
});
