import { expect, test } from "@playwright/test";

import { reportTotals } from "./helpers/assertions";
import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, expectDbFailure, query } from "./helpers/supabaseTestClient";

test("refunds are additive and cannot exceed paid amount", async () => {
  const factory = new FinancialTestFactory(createRunId("refund"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();
  await factory.openSession();

  try {
    const tx = await factory.authedCheckout({
      products: factory.productItems(factory.productId, 1),
      payments: factory.payments([{ method: "cash", amount: 25 }]),
      label: "refund-source",
    });
    const original = await query<{ receipt_number: string; total_amount: string }>(
      "SELECT receipt_number, total_amount FROM public.checkout_transactions WHERE id = $1",
      [tx.transaction_id],
    );

    const partial = await factory.refund(tx.transaction_id, 10);
    expect(partial.refund_status).toBe("partial");
    const full = await factory.refund(tx.transaction_id, 15);
    expect(full.refund_status).toBe("full");

    const overage = await expectDbFailure(
      () => factory.refund(tx.transaction_id, 1),
      /fully refunded/,
    );
    expect(overage.passed).toBe(true);

    const after = await query<{
      receipt_number: string;
      total_amount: string;
      refunded_amount: string;
      refund_status: string;
    }>(
      "SELECT receipt_number, total_amount, refunded_amount, refund_status FROM public.checkout_transactions WHERE id = $1",
      [tx.transaction_id],
    );
    expect(after.rows[0].receipt_number).toBe(original.rows[0].receipt_number);
    expect(Number(after.rows[0].total_amount)).toBe(Number(original.rows[0].total_amount));
    expect(Number(after.rows[0].refunded_amount)).toBe(25);
    expect(after.rows[0].refund_status).toBe("full");

    const reversalRows = await query<{ count: string }>(
      "SELECT count(*) FROM public.checkout_transactions WHERE business_id = $1 AND transaction_type = 'refund'",
      [factory.businessId],
    );
    expect(Number(reversalRows.rows[0].count)).toBe(2);

    const totals = await reportTotals(factory.businessId);
    expect(Number(totals.refunds)).toBe(25);
  } finally {
    await cleanupFinancialTest(factory);
  }
});
