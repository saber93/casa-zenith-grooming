import { randomUUID } from "node:crypto";

import { query } from "./uatTestClient";

export type UatRole =
  | "platform_admin"
  | "business_owner"
  | "business_admin"
  | "reception"
  | "cashier"
  | "barber"
  | "viewer";

export type UatUser = {
  id: string;
  identityId: string;
  email: string;
  password: string;
  role: UatRole;
};

export class UatDataFactory {
  readonly runId: string;
  readonly businessId = randomUUID();
  readonly otherBusinessId = randomUUID();
  readonly beautyBusinessId = randomUUID();
  readonly serviceId = randomUUID();
  readonly productId = randomUUID();
  readonly barberId = randomUUID();
  readonly customerId = randomUUID();
  readonly queueTicketId = randomUUID();
  readonly users: Record<UatRole, UatUser>;

  constructor(runId: string) {
    this.runId = runId;
    this.users = {
      platform_admin: this.createUser("platform-admin"),
      business_owner: this.createUser("owner"),
      business_admin: this.createUser("business-admin"),
      reception: this.createUser("reception"),
      cashier: this.createUser("cashier"),
      barber: this.createUser("barber"),
      viewer: this.createUser("viewer"),
    };
  }

  private createUser(label: string): UatUser {
    return {
      id: randomUUID(),
      identityId: randomUUID(),
      email: `${this.runId}-${label}@example.test`,
      password: "CasaUat2026!",
      role: label === "platform-admin" ? "platform_admin" : (label.replace("-", "_") as UatRole),
    };
  }

  async setup() {
    await this.cleanup();

    for (const user of Object.values(this.users)) {
      await this.insertAuthUser(user);
    }

    await query("INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'platform_admin')", [
      this.users.platform_admin.id,
    ]);

    await query(
      `
      INSERT INTO public.businesses (
        id, slug, name_en, name_ar, business_type, status, default_locale, timezone, currency,
        phone, city, country
      )
      VALUES
        ($1, $2, 'Casa UAT Demo Spa', 'سبا كازا التجريبي', 'spa', 'active', 'en', 'Asia/Dubai', 'AED', '+971544767690', 'Dubai', 'UAE'),
        ($3, $4, 'Casa UAT Other Branch', 'فرع كازا الآخر', 'barbershop', 'active', 'en', 'Asia/Dubai', 'AED', '+971544767690', 'Dubai', 'UAE'),
        ($5, $6, 'Casa UAT Beauty Salon', 'صالون كازا التجميلي', 'beauty_salon', 'active', 'en', 'Asia/Dubai', 'AED', '+971544767690', 'Dubai', 'UAE')
      `,
      [
        this.businessId,
        this.runId,
        this.otherBusinessId,
        `${this.runId}-other`,
        this.beautyBusinessId,
        `${this.runId}-beauty`,
      ],
    );

    await query(
      `
      INSERT INTO public.business_working_days (business_id, day_of_week, is_active, open_time, close_time)
      SELECT $1, day, day <> 5, '10:00'::time, '22:00'::time
      FROM generate_series(0, 6) AS day
      ON CONFLICT (business_id, day_of_week)
      DO UPDATE SET is_active = EXCLUDED.is_active, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time
      `,
      [this.businessId],
    );

    const enabledModules = [
      "reservations",
      "walk_in_queue",
      "barber_workspace",
      "queue_display",
      "queue_analytics",
      "products_catalog",
      "products_pos",
      "staff",
      "resources",
      "memberships",
      "discounts",
      "wallets",
      "suppliers_expenses",
      "reports",
    ];
    for (const moduleKey of enabledModules) {
      await query(
        `
        INSERT INTO public.business_modules (business_id, module_key, enabled, updated_at)
        VALUES ($1, $2, true, now())
        ON CONFLICT (business_id, module_key) DO UPDATE SET enabled = true, updated_at = now()
        `,
        [this.businessId, moduleKey],
      );
    }

    await query(
      `
      INSERT INTO public.services (
        id, business_id, slug_en, slug_ar, title_en, title_ar, price, duration_minutes,
        default_duration_min, default_duration_max, buffer_minutes, is_active
      )
      VALUES
        ($1, $2, $3, $4, 'UAT Massage Session', 'جلسة مساج اختبارية', 250, 60, 50, 70, 10, true)
      `,
      [this.serviceId, this.businessId, `${this.runId}-massage`, `${this.runId}-massage-ar`],
    );

    await query(
      `
      INSERT INTO public.products (id, business_id, slug_en, slug_ar, name_en, name_ar, price, stock_quantity, is_active)
      VALUES ($1, $2, $3, $4, 'UAT Spa Oil', 'زيت سبا اختباري', 75, 20, true)
      `,
      [this.productId, this.businessId, `${this.runId}-oil`, `${this.runId}-oil-ar`],
    );

    await query(
      `
      INSERT INTO public.barbers (id, business_id, name_en, name_ar, bio_en, bio_ar, is_active)
      VALUES ($1, $2, 'UAT Therapist', 'المعالج التجريبي', 'Demo therapist for UAT.', 'معالج تجريبي لاختبار النظام.', true)
      `,
      [this.barberId, this.businessId],
    );

    await query(
      `
      INSERT INTO public.business_memberships (business_id, user_id, role, barber_id, status)
      VALUES
        ($1, $2, 'business_owner', NULL, 'active'),
        ($1, $3, 'business_admin', NULL, 'active'),
        ($1, $4, 'reception', NULL, 'active'),
        ($1, $5, 'cashier', NULL, 'active'),
        ($1, $6, 'barber', $7, 'active'),
        ($1, $8, 'viewer', NULL, 'active')
      `,
      [
        this.businessId,
        this.users.business_owner.id,
        this.users.business_admin.id,
        this.users.reception.id,
        this.users.cashier.id,
        this.users.barber.id,
        this.barberId,
        this.users.viewer.id,
      ],
    );

    await query(
      `
      INSERT INTO public.customers (id, business_id, full_name, phone, preferred_language, updated_at)
      VALUES ($1, $2, 'UAT Walk-in Customer', $3, 'en', now())
      `,
      [this.customerId, this.businessId, `97150${this.runId.slice(-7).replace(/\D/g, "0")}`],
    );

    await query(
      `
      INSERT INTO public.queue_tickets (
        id, business_id, customer_id, service_id, barber_id, customer_name, customer_phone,
        queue_date, queue_number, mode, status, estimated_wait_min, estimated_wait_max,
        prediction_confidence, language, notes
      )
      VALUES ($1, $2, $3, $4, $5, 'UAT Walk-in Customer', '971500001111', CURRENT_DATE, 9001,
        'specific_barber', 'waiting', 10, 20, 'low', 'en', $6)
      `,
      [
        this.queueTicketId,
        this.businessId,
        this.customerId,
        this.serviceId,
        this.barberId,
        this.runId,
      ],
    );
  }

  private async insertAuthUser(user: UatUser) {
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
      [user.id, user.email, user.password],
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
        jsonb_build_object('sub', $2::uuid::text, 'email', $3::text, 'email_verified', true, 'phone_verified', false),
        'email',
        now(),
        now(),
        now()
      )
      `,
      [user.identityId, user.id, user.email],
    );
  }

  async cleanup() {
    const allUserIds = Object.values(this.users).map((user) => user.id);
    const businessIds = [this.businessId, this.otherBusinessId, this.beautyBusinessId];
    await query(
      "DELETE FROM public.queue_tickets WHERE business_id = ANY($1::uuid[]) OR notes = $2",
      [businessIds, this.runId],
    ).catch(() => {});
    await query("DELETE FROM public.bookings WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]).catch(() => {});
    await query("DELETE FROM public.customers WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]).catch(() => {});
    await query("DELETE FROM public.products WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]).catch(() => {});
    await query("DELETE FROM public.services WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]).catch(() => {});
    await query(
      "DELETE FROM public.business_memberships WHERE business_id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])",
      [businessIds, allUserIds],
    ).catch(() => {});
    await query("DELETE FROM public.barbers WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]).catch(() => {});
    await query("DELETE FROM public.business_working_days WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]).catch(() => {});
    await query("DELETE FROM public.business_modules WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]).catch(() => {});
    await query("DELETE FROM public.businesses WHERE id = ANY($1::uuid[])", [businessIds]).catch(
      () => {},
    );
    await query("DELETE FROM public.user_roles WHERE user_id = ANY($1::uuid[])", [
      allUserIds,
    ]).catch(() => {});
    await query("DELETE FROM auth.identities WHERE user_id = ANY($1::uuid[])", [allUserIds]).catch(
      () => {},
    );
    await query("DELETE FROM auth.users WHERE id = ANY($1::uuid[])", [allUserIds]).catch(() => {});
  }
}
