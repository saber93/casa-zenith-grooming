import { expect, test } from "@playwright/test";

import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, expectDbFailure, query } from "./helpers/supabaseTestClient";

test("wallet checkout debits atomically and refund status is explicit", async () => {
  const factory = new FinancialTestFactory(createRunId("wallet"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();
  await factory.openSession();

  try {
    const bookingId = await factory.createBooking("wallet");
    const tx = await factory.authedCheckout({
      bookingId,
      services: factory.serviceItems(),
      walletAmount: 20,
      payments: factory.payments([
        { method: "card", amount: 80 },
        { method: "wallet_reference", amount: 0, wallet_id: factory.walletId },
      ]),
      label: "wallet",
    });
    const balance = await query<{ amount: string }>(
      "SELECT amount FROM public.wallets WHERE id = $1",
      [factory.walletId],
    );
    expect(Number(balance.rows[0].amount)).toBe(30);

    const ledger = await query<{ count: string }>(
      "SELECT count(*) FROM public.financial_ledger_entries WHERE checkout_transaction_id = $1 AND category = 'wallet'",
      [tx.transaction_id],
    );
    expect(Number(ledger.rows[0].count)).toBe(1);

    const beforeFailure = Number(balance.rows[0].amount);
    const failed = await expectDbFailure(
      () =>
        factory.authedCheckout({
          services: factory.serviceItems(),
          walletAmount: 999,
          payments: factory.payments([
            { method: "wallet_reference", amount: 0, wallet_id: factory.walletId },
          ]),
          label: "wallet-insufficient",
        }),
      /Insufficient wallet balance/,
    );
    expect(failed.passed).toBe(true);

    const afterFailure = await query<{ amount: string }>(
      "SELECT amount FROM public.wallets WHERE id = $1",
      [factory.walletId],
    );
    expect(Number(afterFailure.rows[0].amount)).toBe(beforeFailure);

    const refund = await factory.refund(tx.transaction_id, 5);
    expect(refund.wallet_restoration_status).toBe("manual_required");
  } finally {
    await cleanupFinancialTest(factory);
  }
});
