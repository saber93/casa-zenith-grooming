import { expect, test } from "@playwright/test";

import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, expectDbFailure, query } from "./helpers/supabaseTestClient";

test("inventory decrements, rolls back on failure, and restores on product refund", async () => {
  const factory = new FinancialTestFactory(createRunId("inventory"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();
  await factory.openSession();

  try {
    const tx = await factory.authedCheckout({
      products: factory.productItems(factory.secondProductId, 1),
      payments: factory.payments([{ method: "cash", amount: 25 }]),
      label: "product-sale",
    });
    const stockAfterSale = await query<{ stock_quantity: number }>(
      "SELECT stock_quantity FROM public.products WHERE id = $1",
      [factory.secondProductId],
    );
    expect(Number(stockAfterSale.rows[0].stock_quantity)).toBe(0);

    const saleMovement = await query<{ count: string }>(
      "SELECT count(*) FROM public.product_inventory_movements WHERE checkout_transaction_id = $1 AND movement_type = 'sale'",
      [tx.transaction_id],
    );
    expect(Number(saleMovement.rows[0].count)).toBe(1);

    const failed = await expectDbFailure(
      () =>
        factory.authedCheckout({
          products: factory.productItems(factory.secondProductId, 1),
          payments: factory.payments([{ method: "cash", amount: 25 }]),
          label: "insufficient-product",
        }),
      /Insufficient stock/,
    );
    expect(failed.passed).toBe(true);

    const stockAfterFailure = await query<{ stock_quantity: number }>(
      "SELECT stock_quantity FROM public.products WHERE id = $1",
      [factory.secondProductId],
    );
    expect(Number(stockAfterFailure.rows[0].stock_quantity)).toBe(0);

    await factory.refund(
      tx.transaction_id,
      25,
      JSON.stringify([{ product_id: factory.secondProductId, qty: 1 }]),
    );
    const stockAfterRefund = await query<{ stock_quantity: number }>(
      "SELECT stock_quantity FROM public.products WHERE id = $1",
      [factory.secondProductId],
    );
    expect(Number(stockAfterRefund.rows[0].stock_quantity)).toBe(1);

    const refundMovement = await query<{ count: string }>(
      "SELECT count(*) FROM public.product_inventory_movements WHERE product_id = $1 AND movement_type = 'refund'",
      [factory.secondProductId],
    );
    expect(Number(refundMovement.rows[0].count)).toBe(1);
  } finally {
    await cleanupFinancialTest(factory);
  }
});
