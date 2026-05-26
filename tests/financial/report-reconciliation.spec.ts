import { expect, test } from "@playwright/test";

import { legacyTotals, reportTotals } from "./helpers/assertions";
import { cleanupFinancialTest } from "./helpers/cleanup";
import { FinancialTestFactory } from "./helpers/testDataFactory";
import { createRunId, expectDbFailure, query } from "./helpers/supabaseTestClient";

test("package, discount, tips, commissions, booking, queue, product POS and reports reconcile", async () => {
  const factory = new FinancialTestFactory(createRunId("report-reconciliation"));
  await cleanupFinancialTest(factory).catch(() => {});
  await factory.setup();
  await factory.openSession();

  try {
    const serviceBooking = await factory.createBooking("booking-service");
    const serviceTx = await factory.authedCheckout({
      bookingId: serviceBooking,
      services: factory.serviceItems(),
      payments: factory.payments([{ method: "card", amount: 100 }]),
      label: "booking-service",
    });
    expect(serviceTx.cashier_session_id).toBeTruthy();

    const booking = await query<{ checkout_status: string }>(
      "SELECT checkout_status FROM public.bookings WHERE id = $1",
      [serviceBooking],
    );
    expect(booking.rows[0].checkout_status).toBe("completed");

    const queueTicket = await factory.createQueueTicket("queue-service");
    await factory.authedCheckout({
      queueTicketId: queueTicket,
      services: factory.serviceItems(),
      payments: factory.payments([{ method: "card", amount: 100 }]),
      label: "queue-service",
    });
    const queue = await query<{
      status: string;
      checkout_completed_at: string;
      service_completed_at: string;
    }>(
      "SELECT status, checkout_completed_at, service_completed_at FROM public.queue_tickets WHERE id = $1",
      [queueTicket],
    );
    expect(queue.rows[0].status).toBe("completed");
    expect(queue.rows[0].checkout_completed_at).toBeTruthy();
    expect(queue.rows[0].service_completed_at).toBeTruthy();

    await factory.authedCheckout({
      products: factory.productItems(factory.productId, 1),
      payments: factory.payments([{ method: "cash", amount: 25 }]),
      label: "standalone-product-pos",
    });

    const packageTx = await factory.authedCheckout({
      services: factory.serviceItems(),
      packageUsage: JSON.stringify([
        { benefit_id: factory.benefitId, service_id: factory.serviceId, qty: 1 },
      ]),
      tips: 5,
      payments: factory.payments([{ method: "cash", amount: 5 }]),
      label: "package",
    });
    expect(packageTx.package_amount).toBe(100);
    const benefit = await query<{ remaining_quantity: number }>(
      "SELECT remaining_quantity FROM public.customer_package_benefits WHERE id = $1",
      [factory.benefitId],
    );
    expect(Number(benefit.rows[0].remaining_quantity)).toBe(0);

    const exhausted = await expectDbFailure(
      () =>
        factory.authedCheckout({
          services: factory.serviceItems(),
          packageUsage: JSON.stringify([
            { benefit_id: factory.benefitId, service_id: factory.serviceId, qty: 1 },
          ]),
          payments: factory.payments([]),
          label: "package-exhausted",
        }),
      /Package benefit is not active|insufficient remaining sessions/,
    );
    expect(exhausted.passed).toBe(true);

    const discountBooking = await factory.createBooking("discount");
    const discountTx = await factory.authedCheckout({
      bookingId: discountBooking,
      services: factory.serviceItems(),
      discount: 999,
      discountCode: `${factory.runId}-VALID`,
      payments: factory.payments([{ method: "card", amount: 90 }]),
      label: "discount",
    });
    expect(discountTx.discount_amount).toBe(10);

    for (const [code, pattern] of [
      [`${factory.runId}-EXPIRED`, /invalid, inactive, or expired/],
      [`${factory.runId}-INACTIVE`, /invalid, inactive, or expired/],
      [`${factory.runId}-LIMIT`, /usage limit has been reached/],
    ] as const) {
      const failed = await expectDbFailure(
        () =>
          factory.authedCheckout({
            services: factory.serviceItems(),
            discountCode: code,
            payments: factory.payments([{ method: "card", amount: 95 }]),
            label: code,
          }),
        pattern,
      );
      expect(failed.passed).toBe(true);
    }

    const beforeRollback = await query<{ benefit_numbers: number }>(
      "SELECT benefit_numbers FROM public.discounts WHERE id = $1",
      [factory.rollbackDiscountId],
    );
    const rollback = await expectDbFailure(
      () =>
        factory.authedCheckout({
          products: factory.productItems(factory.secondProductId, 1),
          walletAmount: 999,
          discountCode: `${factory.runId}-ROLLBACK`,
          payments: factory.payments([
            { method: "wallet_reference", amount: 0, wallet_id: factory.walletId },
          ]),
          label: "discount-rollback",
        }),
      /Insufficient wallet balance/,
    );
    expect(rollback.passed).toBe(true);
    const afterRollback = await query<{ benefit_numbers: number }>(
      "SELECT benefit_numbers FROM public.discounts WHERE id = $1",
      [factory.rollbackDiscountId],
    );
    expect(Number(afterRollback.rows[0].benefit_numbers)).toBe(
      Number(beforeRollback.rows[0].benefit_numbers),
    );

    const walletTx = await factory.authedCheckout({
      services: factory.serviceItems(),
      walletAmount: 20,
      payments: factory.payments([
        { method: "card", amount: 80 },
        { method: "wallet_reference", amount: 0, wallet_id: factory.walletId },
      ]),
      label: "wallet",
    });
    expect(walletTx.wallet_amount).toBe(20);

    await factory.authedCheckout({
      services: factory.serviceItems(),
      walletAmount: 10,
      payments: factory.payments([
        { method: "card", amount: 90 },
        { method: "wallet_reference", amount: 0, wallet_id: factory.commissionWalletId },
      ]),
      label: "commission",
    });

    const tipTx = await factory.authedCheckout({
      services: factory.serviceItems(),
      tips: 10,
      payments: factory.payments([{ method: "cash", amount: 110 }]),
      label: "tip",
    });
    const tipItem = await query<{ count: string }>(
      "SELECT count(*) FROM public.checkout_transaction_items WHERE transaction_id = $1 AND type = 'tip'",
      [tipTx.transaction_id],
    );
    expect(Number(tipItem.rows[0].count)).toBe(1);

    const staffSnapshot = await query<{ staff_snapshot: unknown }>(
      "SELECT staff_snapshot FROM public.checkout_transaction_items WHERE transaction_id = $1 AND type = 'service' LIMIT 1",
      [tipTx.transaction_id],
    );
    expect(staffSnapshot.rows[0].staff_snapshot).toBeTruthy();

    const refund = await factory.refund(walletTx.transaction_id, 5);
    expect(refund.wallet_restoration_status).toBe("manual_required");
    const packageRefund = await factory.refund(packageTx.transaction_id, 2);
    expect(packageRefund.package_restoration_status).toBe("manual_required");

    const totals = await reportTotals(factory.businessId);
    expect(Number(totals.service_revenue)).toBe(600);
    expect(Number(totals.product_revenue)).toBe(25);
    expect(Number(totals.refunds)).toBe(7);
    expect(Number(totals.tips)).toBe(15);
    expect(Number(totals.commissions)).toBe(1);
    expect(Number(totals.wallet_usage)).toBe(30);
    expect(Number(totals.package_usage)).toBe(100);
    expect(Number(totals.discounts)).toBe(10);
    expect(Number(totals.cash_payments)).toBe(140);
    expect(Number(totals.card_payments)).toBe(460);
    expect(Number(totals.transaction_count)).toBe(8);
    expect(Number(totals.cashier_sessions)).toBe(1);
    expect(Number(totals.stock_movement)).toBe(-1);

    const legacy = await legacyTotals(factory.businessId);
    expect(Number(legacy.booking_items_revenue) + Number(legacy.product_sales_revenue)).toBe(0);
  } finally {
    await cleanupFinancialTest(factory);
  }
});
