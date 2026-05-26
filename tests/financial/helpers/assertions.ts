import { expect } from "@playwright/test";

import { query } from "./supabaseTestClient";

export function expectSequentialReceipts(receipts: string[]) {
  const sequences = receipts
    .map((receipt) => Number(receipt.split("-").at(-1)))
    .sort((a, b) => a - b);
  expect(new Set(receipts).size).toBe(receipts.length);
  for (let index = 0; index < sequences.length; index += 1) {
    expect(sequences[index]).toBe(index + 1);
  }
}

export async function reportTotals(businessId: string) {
  const { rows } = await query<{
    service_revenue: string;
    product_revenue: string;
    refunds: string;
    tips: string;
    commissions: string;
    wallet_usage: string;
    package_usage: string;
    discounts: string;
    cash_payments: string;
    card_payments: string;
    transfer_payments: string;
    transaction_count: number;
    cashier_sessions: number;
    stock_movement: number;
  }>(
    `
    WITH sale_txs AS (
      SELECT *
      FROM public.checkout_transactions
      WHERE business_id = $1
        AND payment_status = 'completed'
        AND COALESCE(transaction_type, 'sale') = 'sale'
    ),
    sale_items AS (
      SELECT cti.*
      FROM public.checkout_transaction_items cti
      JOIN sale_txs tx ON tx.id = cti.transaction_id
    ),
    ledger AS (
      SELECT *
      FROM public.financial_ledger_entries
      WHERE business_id = $1
    ),
    payments AS (
      SELECT
        lower(payment->>'method') AS method,
        COALESCE((payment->>'amount')::numeric, 0) AS amount
      FROM sale_txs tx
      CROSS JOIN LATERAL jsonb_array_elements(tx.payments) AS payment
    )
    SELECT
      GREATEST(
        0,
        COALESCE((SELECT sum(total) FROM sale_items WHERE type = 'service'), 0)
        - COALESCE((SELECT sum(package_amount) FROM sale_txs), 0)
      )::numeric(10,2) AS service_revenue,
      COALESCE((SELECT sum(total) FROM sale_items WHERE type = 'product'), 0)::numeric(10,2) AS product_revenue,
      COALESCE((SELECT sum(amount) FROM ledger WHERE category = 'refund'), 0)::numeric(10,2) AS refunds,
      COALESCE((SELECT sum(amount) FROM ledger WHERE category = 'tip'), 0)::numeric(10,2) AS tips,
      COALESCE((SELECT sum(amount) FROM ledger WHERE category = 'commission'), 0)::numeric(10,2) AS commissions,
      COALESCE((SELECT sum(wallet_amount) FROM sale_txs), 0)::numeric(10,2) AS wallet_usage,
      COALESCE((SELECT sum(package_amount) FROM sale_txs), 0)::numeric(10,2) AS package_usage,
      COALESCE((SELECT sum(discount_amount + membership_amount) FROM sale_txs), 0)::numeric(10,2) AS discounts,
      COALESCE((SELECT sum(amount) FROM payments WHERE method = 'cash'), 0)::numeric(10,2) AS cash_payments,
      COALESCE((SELECT sum(amount) FROM payments WHERE method = 'card'), 0)::numeric(10,2) AS card_payments,
      COALESCE((SELECT sum(amount) FROM payments WHERE method = 'transfer'), 0)::numeric(10,2) AS transfer_payments,
      (SELECT count(*) FROM sale_txs)::int AS transaction_count,
      (SELECT count(*) FROM public.cashier_sessions WHERE business_id = $1)::int AS cashier_sessions,
      (SELECT COALESCE(sum(qty_delta), 0) FROM public.product_inventory_movements WHERE business_id = $1)::int AS stock_movement
    `,
    [businessId],
  );
  return rows[0];
}

export async function legacyTotals(businessId: string) {
  const { rows } = await query<{
    booking_items_revenue: string;
    product_sales_revenue: string;
  }>(
    `
    SELECT
      COALESCE((SELECT sum(price) FROM public.booking_items WHERE business_id = $1 AND status = 'completed'), 0)::numeric(10,2) AS booking_items_revenue,
      COALESCE((SELECT sum(total) FROM public.product_sales WHERE business_id = $1 AND status = 'completed'), 0)::numeric(10,2) AS product_sales_revenue
    `,
    [businessId],
  );
  return rows[0];
}
