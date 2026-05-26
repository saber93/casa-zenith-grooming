import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const command = process.argv[2] ?? "create";
const runId = process.argv[3] ?? `uat-demo-${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!password) {
  console.error("SUPABASE_DB_PASSWORD is required.");
  process.exit(1);
}

const poolerUrl =
  "postgresql://postgres.oogwfqnrgdvngifycdxk@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
const pool = new Pool({
  connectionString: poolerUrl.replace("@", `:${encodeURIComponent(password)}@`),
  ssl: { rejectUnauthorized: false },
  max: 4,
});

const roles = [
  "platform_admin",
  "business_owner",
  "business_admin",
  "reception",
  "cashier",
  "barber",
  "viewer",
];
const userId = (role) => randomUUID();
const identityId = () => randomUUID();
const businessId = randomUUID();
const barberId = randomUUID();
const serviceId = randomUUID();
const productId = randomUUID();
const customerId = randomUUID();
const queueTicketId = randomUUID();
const demoPassword = "CasaDemo2026!";

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function cleanup(targetRunId) {
  const like = `%${targetRunId}%`;
  const users = await query("SELECT id FROM auth.users WHERE email LIKE $1", [like]);
  const userIds = users.rows.map((row) => row.id);
  const businesses = await query("SELECT id FROM public.businesses WHERE slug = $1 OR slug = $2", [
    targetRunId,
    `${targetRunId}-other`,
  ]);
  const businessIds = businesses.rows.map((row) => row.id);

  if (businessIds.length > 0) {
    await query("DELETE FROM public.queue_tickets WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.bookings WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.customers WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.products WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.services WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.barbers WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.business_working_days WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.business_modules WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.business_memberships WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.businesses WHERE id = ANY($1::uuid[])", [businessIds]);
  }

  if (userIds.length > 0) {
    await query("DELETE FROM public.business_memberships WHERE user_id = ANY($1::uuid[])", [
      userIds,
    ]);
    await query("DELETE FROM public.user_roles WHERE user_id = ANY($1::uuid[])", [userIds]);
    await query("DELETE FROM auth.identities WHERE user_id = ANY($1::uuid[])", [userIds]);
    await query("DELETE FROM auth.users WHERE id = ANY($1::uuid[])", [userIds]);
  }

  return { businessRows: businessIds.length, authUsers: userIds.length };
}

async function createAuthUser(user) {
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
    [user.id, user.email, demoPassword],
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

async function create() {
  await cleanup(runId);

  const users = roles.map((role) => ({
    role,
    id: userId(role),
    identityId: identityId(),
    email: `${runId}-${role.replace("_", "-")}@example.test`,
  }));

  for (const user of users) await createAuthUser(user);
  const byRole = Object.fromEntries(users.map((user) => [user.role, user]));

  await query("INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'platform_admin')", [
    byRole.platform_admin.id,
  ]);
  await query(
    `
    INSERT INTO public.businesses (id, slug, name_en, name_ar, business_type, status, default_locale, timezone, currency, phone, city, country)
    VALUES ($1, $2, 'Demo Owner Spa', 'سبا تجريبي للمالك', 'spa', 'active', 'en', 'Asia/Dubai', 'AED', '+971544767690', 'Dubai', 'UAE')
    `,
    [businessId, runId],
  );

  await query(
    `
    INSERT INTO public.business_working_days (business_id, day_of_week, is_active, open_time, close_time)
    SELECT $1, day, day <> 5, '10:00'::time, '22:00'::time
    FROM generate_series(0, 6) AS day
    `,
    [businessId],
  );

  for (const moduleKey of [
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
  ]) {
    await query(
      "INSERT INTO public.business_modules (business_id, module_key, enabled) VALUES ($1, $2, true)",
      [businessId, moduleKey],
    );
  }

  await query(
    `
    INSERT INTO public.barbers (id, business_id, name_en, name_ar, bio_en, bio_ar, is_active)
    VALUES ($1, $2, 'Demo Therapist', 'المعالج التجريبي', 'Spa therapist for owner demo.', 'معالج سبا للعرض التجريبي.', true)
    `,
    [barberId, businessId],
  );

  await query(
    `
    INSERT INTO public.business_memberships (business_id, user_id, role, barber_id, status, must_change_password)
    VALUES
      ($1, $2, 'business_owner', NULL, 'active', false),
      ($1, $3, 'business_admin', NULL, 'active', false),
      ($1, $4, 'reception', NULL, 'active', false),
      ($1, $5, 'cashier', NULL, 'active', false),
      ($1, $6, 'barber', $7, 'active', false),
      ($1, $8, 'viewer', NULL, 'active', false)
    `,
    [
      businessId,
      byRole.business_owner.id,
      byRole.business_admin.id,
      byRole.reception.id,
      byRole.cashier.id,
      byRole.barber.id,
      barberId,
      byRole.viewer.id,
    ],
  );

  await query(
    `
    INSERT INTO public.services (id, business_id, slug_en, slug_ar, title_en, title_ar, price, duration_minutes, default_duration_min, default_duration_max, buffer_minutes, is_active)
    VALUES ($1, $2, $3, $4, 'Demo Massage Session', 'جلسة مساج تجريبية', 250, 60, 50, 70, 10, true)
    `,
    [serviceId, businessId, `${runId}-massage`, `${runId}-massage-ar`],
  );
  await query(
    `
    INSERT INTO public.products (id, business_id, slug_en, slug_ar, name_en, name_ar, price, stock_quantity, is_active)
    VALUES ($1, $2, $3, $4, 'Demo Spa Oil', 'زيت سبا تجريبي', 75, 20, true)
    `,
    [productId, businessId, `${runId}-oil`, `${runId}-oil-ar`],
  );
  await query(
    `
    INSERT INTO public.customers (id, business_id, full_name, phone, preferred_language, updated_at)
    VALUES ($1, $2, 'Demo Walk-in Customer', '971500001111', 'en', now())
    `,
    [customerId, businessId],
  );
  await query(
    `
    INSERT INTO public.queue_tickets (id, business_id, customer_id, service_id, barber_id, customer_name, customer_phone, queue_date, queue_number, mode, status, estimated_wait_min, estimated_wait_max, prediction_confidence, language, notes)
    VALUES ($1, $2, $3, $4, $5, 'Demo Walk-in Customer', '971500001111', CURRENT_DATE, 1001, 'specific_barber', 'waiting', 10, 20, 'low', 'en', $6)
    `,
    [queueTicketId, businessId, customerId, serviceId, barberId, runId],
  );

  console.log(
    JSON.stringify(
      {
        runId,
        business: { id: businessId, slug: runId, name: "Demo Owner Spa" },
        password: demoPassword,
        users: users.map(({ role, email }) => ({ role, email })),
        cleanup: `SUPABASE_DB_PASSWORD=... node scripts/uat-demo.mjs cleanup ${runId}`,
      },
      null,
      2,
    ),
  );
}

try {
  if (command === "create") {
    await create();
  } else if (command === "cleanup") {
    console.log(JSON.stringify({ runId, cleanup: await cleanup(runId) }, null, 2));
  } else {
    throw new Error("Use: node scripts/uat-demo.mjs create [runId] OR cleanup <runId>");
  }
} finally {
  await pool.end();
}
