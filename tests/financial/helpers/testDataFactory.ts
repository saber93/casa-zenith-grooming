import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { query, withAuth } from "./supabaseTestClient";

export type CheckoutResult = {
  transaction_id: string;
  receipt_number: string;
  total_amount: number;
  discount_amount?: number;
  wallet_amount?: number;
  package_amount?: number;
  cashier_session_id?: string;
  refund_status?: string;
  refund_transaction_id?: string;
  wallet_restoration_status?: string;
  package_restoration_status?: string;
};

export class FinancialTestFactory {
  readonly runId: string;
  readonly authUserId = randomUUID();
  readonly businessId = randomUUID();
  readonly customerId = randomUUID();
  readonly serviceId = randomUUID();
  readonly productId = randomUUID();
  readonly secondProductId = randomUUID();
  readonly walletId = randomUUID();
  readonly commissionWalletId = randomUUID();
  readonly packageId = randomUUID();
  readonly customerPackageId = randomUUID();
  readonly benefitId = randomUUID();
  readonly identityId = randomUUID();
  readonly discountId = randomUUID();
  readonly rollbackDiscountId = randomUUID();
  readonly expiredDiscountId = randomUUID();
  readonly inactiveDiscountId = randomUUID();
  readonly overLimitDiscountId = randomUUID();
  readonly authPassword = "FinancialQa2026!";
  cashierSessionId: string | null = null;

  constructor(runId: string) {
    this.runId = runId;
  }

  async setup() {
    await query(
      `
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, reauthentication_token,
        raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous, created_at, updated_at
      )
      VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        $2, crypt($3, gen_salt('bf')), now(),
        '', '', '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"email_verified":true}'::jsonb,
        false,
        false,
        now(),
        now()
      )
      `,
      [this.authUserId, `${this.runId}@example.test`, this.authPassword],
    );
    await query(
      `
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $2::uuid::text,
        jsonb_build_object('sub', $2::uuid::text, 'email', $3::text, 'email_verified', false, 'phone_verified', false),
        'email',
        now(),
        now(),
        now()
      )
      `,
      [this.identityId, this.authUserId, `${this.runId}@example.test`],
    );
    await query("INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')", [
      this.authUserId,
    ]);
    await query(
      `
      INSERT INTO public.businesses (id, slug, name_en, name_ar, business_type, status, default_locale, timezone, currency)
      VALUES ($1, $2, 'Financial QA', 'اختبار مالي', 'barbershop', 'active', 'en', 'Asia/Dubai', 'AED')
      `,
      [this.businessId, this.runId],
    );
    await query(
      "INSERT INTO public.business_memberships (business_id, user_id, role) VALUES ($1, $2, 'business_owner')",
      [this.businessId, this.authUserId],
    );
    await query(
      "INSERT INTO public.customers (id, business_id, full_name, phone, preferred_language, updated_at) VALUES ($1, $2, 'Financial QA Customer', $3, 'en', now())",
      [this.customerId, this.businessId, `555-${this.runId}`],
    );
    await query(
      `
      INSERT INTO public.services (id, business_id, slug_en, slug_ar, title_en, title_ar, price, duration_minutes, is_active)
      VALUES ($1, $2, $3, $4, 'QA Service', 'خدمة اختبار', 100, 30, true)
      `,
      [this.serviceId, this.businessId, `${this.runId}-service`, `${this.runId}-service-ar`],
    );
    await query(
      `
      INSERT INTO public.products (id, business_id, slug_en, slug_ar, name_en, name_ar, price, stock_quantity, is_active)
      VALUES
        ($1, $2, $3, $4, 'QA Product', 'منتج اختبار', 25, 30, true),
        ($5, $2, $6, $7, 'QA Limited Product', 'منتج محدود', 25, 1, true)
      `,
      [
        this.productId,
        this.businessId,
        `${this.runId}-product`,
        `${this.runId}-product-ar`,
        this.secondProductId,
        `${this.runId}-limited-product`,
        `${this.runId}-limited-product-ar`,
      ],
    );
    await query(
      `
      INSERT INTO public.wallets (id, business_id, code, amount, invoiced_amount, status, starts_at, ends_at)
      VALUES
        ($1, $2, $3, 50, 50, 'active', CURRENT_DATE - 1, CURRENT_DATE + 30),
        ($4, $2, $5, 50, 50, 'active', CURRENT_DATE - 1, CURRENT_DATE + 30)
      `,
      [
        this.walletId,
        this.businessId,
        `${this.runId}-wallet`,
        this.commissionWalletId,
        `${this.runId}-commission-wallet`,
      ],
    );
    await query(
      "INSERT INTO public.user_wallets (business_id, wallet_id, staff_id, amount, invoiced_amount, commission_percent) VALUES ($1, $2, NULL, 50, 50, 10)",
      [this.businessId, this.commissionWalletId],
    );
    await query(
      "INSERT INTO public.packages (id, business_id, name_en, name_ar, price, is_active) VALUES ($1, $2, 'QA Package', 'باقة اختبار', 100, true)",
      [this.packageId, this.businessId],
    );
    await query(
      "INSERT INTO public.customer_packages (id, business_id, customer_name, customer_phone, package_id, price_paid, status) VALUES ($1, $2, 'Financial QA Customer', $3, $4, 100, 'active')",
      [this.customerPackageId, this.businessId, `555-${this.runId}`, this.packageId],
    );
    await query(
      "INSERT INTO public.customer_package_benefits (id, customer_package_id, service_id, total_quantity, remaining_quantity) VALUES ($1, $2, $3, 1, 1)",
      [this.benefitId, this.customerPackageId, this.serviceId],
    );
    await query(
      `
      INSERT INTO public.discounts (id, business_id, code, type, amount, starts_at, ends_at, status, using_type, benefit_numbers)
      VALUES
        ($1, $2, $3, 'percentage', 10, CURRENT_DATE - 1, CURRENT_DATE + 30, 'active', 'limited_quantity', 2),
        ($4, $2, $5, 'fixed', 5, CURRENT_DATE - 1, CURRENT_DATE + 30, 'active', 'limited_quantity', 1),
        ($6, $2, $7, 'fixed', 5, CURRENT_DATE - 30, CURRENT_DATE - 1, 'active', 'unlimited', 0),
        ($8, $2, $9, 'fixed', 5, CURRENT_DATE - 1, CURRENT_DATE + 30, 'inactive', 'unlimited', 0),
        ($10, $2, $11, 'fixed', 5, CURRENT_DATE - 1, CURRENT_DATE + 30, 'active', 'limited_quantity', 0)
      `,
      [
        this.discountId,
        this.businessId,
        `${this.runId}-VALID`,
        this.rollbackDiscountId,
        `${this.runId}-ROLLBACK`,
        this.expiredDiscountId,
        `${this.runId}-EXPIRED`,
        this.inactiveDiscountId,
        `${this.runId}-INACTIVE`,
        this.overLimitDiscountId,
        `${this.runId}-LIMIT`,
      ],
    );
  }

  serviceItems(price = 100) {
    return JSON.stringify([
      {
        service_id: this.serviceId,
        name: "QA Service",
        price,
        qty: 1,
        discount: 0,
        snapshot: { run_id: this.runId, service_id: this.serviceId, name: "QA Service", price },
      },
    ]);
  }

  productItems(productId = this.productId, qty = 1) {
    return JSON.stringify([
      {
        product_id: productId,
        name: "QA Product",
        price: 25,
        qty,
        discount: 0,
        snapshot: { run_id: this.runId, product_id: productId, name: "QA Product", price: 25 },
      },
    ]);
  }

  payments(items: { method: string; amount: number; wallet_id?: string }[]) {
    return JSON.stringify(items);
  }

  async openSession(openingCash = 0) {
    const result = await withAuth(this.authUserId, (client) =>
      client.query<{ result: Record<string, unknown> }>(
        "SELECT public.open_cashier_session($1::uuid, $2::numeric, $3::text) AS result",
        [this.businessId, openingCash, `${this.runId}:open`],
      ),
    );
    this.cashierSessionId = String(result.rows[0].result.id);
    return result.rows[0].result;
  }

  async closeSession(actualCash: number) {
    if (!this.cashierSessionId) {
      const active = await this.activeSession();
      this.cashierSessionId =
        active && active.active !== false && active.id ? String(active.id) : null;
    }
    if (!this.cashierSessionId) {
      throw new Error("No active cashier session available to close.");
    }

    return withAuth(this.authUserId, async (client) => {
      const result = await client.query<{ result: Record<string, unknown> }>(
        "SELECT public.close_cashier_session($1::uuid, $2::numeric, $3::text) AS result",
        [this.cashierSessionId, actualCash, `${this.runId}:close`],
      );
      this.cashierSessionId = null;
      return result.rows[0].result;
    });
  }

  async activeSession() {
    return withAuth(this.authUserId, async (client) => {
      const result = await client.query<{ result: Record<string, unknown>[] }>(
        "SELECT public.get_active_cashier_session($1::uuid) AS result",
        [this.businessId],
      );
      return result.rows[0].result;
    });
  }

  async createBooking(label: string) {
    const result = await query<{ id: string }>(
      `
      INSERT INTO public.bookings (
        business_id, customer_id, service_id, customer_name, customer_phone,
        booking_date, booking_time, status, language, notes, checkout_status
      )
      VALUES ($1, $2, $3, 'Financial QA Customer', $4, CURRENT_DATE + 1, clock_timestamp()::time, 'confirmed', 'en', $5, 'pending')
      RETURNING id
      `,
      [
        this.businessId,
        this.customerId,
        this.serviceId,
        `555-${this.runId}`,
        `${this.runId}:${label}`,
      ],
    );
    return result.rows[0].id;
  }

  async createQueueTicket(label: string) {
    const result = await query<{ id: string }>(
      `
      INSERT INTO public.queue_tickets (
        business_id, customer_id, service_id, customer_name, customer_phone,
        queue_date, queue_number, mode, status, language, notes, started_at, completed_at, service_completed_at
      )
      VALUES ($1, $2, $3, 'Financial QA Customer', $4, CURRENT_DATE, $6, 'any_barber', 'ready_for_checkout', 'en', $5, now() - interval '30 minutes', now(), now())
      RETURNING id
      `,
      [
        this.businessId,
        this.customerId,
        this.serviceId,
        `555-${this.runId}`,
        `${this.runId}:${label}`,
        800000 + Math.floor(Math.random() * 100000),
      ],
    );
    return result.rows[0].id;
  }

  async checkout(
    client: PoolClient,
    args: {
      action?: "preview" | "complete";
      bookingId?: string | null;
      queueTicketId?: string | null;
      services?: string;
      products?: string;
      tips?: number;
      walletAmount?: number;
      packageUsage?: string;
      membershipDiscount?: number;
      discount?: number;
      discountCode?: string | null;
      payments?: string;
      label: string;
    },
  ): Promise<CheckoutResult> {
    const result = await client.query<{ result: CheckoutResult }>(
      `
      SELECT public.checkout_transaction(
        $1::text,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::jsonb,
        $6::jsonb,
        $7::numeric,
        $8::numeric,
        $9::jsonb,
        $10::numeric,
        $11::numeric,
        0::numeric,
        $12::jsonb,
        $13::text,
        $14::uuid,
        $15::text,
        NULL::uuid
      ) AS result
      `,
      [
        args.action ?? "complete",
        args.bookingId ?? null,
        args.queueTicketId ?? null,
        this.customerId,
        args.services ?? "[]",
        args.products ?? "[]",
        args.tips ?? 0,
        args.walletAmount ?? 0,
        args.packageUsage ?? "[]",
        args.membershipDiscount ?? 0,
        args.discount ?? 0,
        args.payments ?? "[]",
        `${this.runId}:${args.label}`,
        this.authUserId,
        args.discountCode ?? null,
      ],
    );
    return result.rows[0].result;
  }

  async authedCheckout(args: Parameters<FinancialTestFactory["checkout"]>[1]) {
    return withAuth(this.authUserId, (client) => this.checkout(client, args));
  }

  async refund(transactionId: string, amount: number, products = "[]") {
    return withAuth(this.authUserId, async (client) => {
      const result = await client.query<{ result: CheckoutResult }>(
        "SELECT public.refund_checkout_transaction($1::uuid, $2::numeric, $3::text, $4::jsonb) AS result",
        [transactionId, amount, `${this.runId}:refund`, products],
      );
      return result.rows[0].result;
    });
  }
}
