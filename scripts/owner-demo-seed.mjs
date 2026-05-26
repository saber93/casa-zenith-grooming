import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const command = process.argv[2] ?? "create";
const runId = process.argv[3] ?? `owner-demo-${Date.now()}-${randomUUID().slice(0, 8)}`;
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
  max: 1,
});

const demoPassword = "CasaOwnerDemo2026!";
const moduleKeys = [
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

const roleKeys = [
  "platform_admin",
  "casa_owner",
  "casa_admin",
  "casa_reception",
  "casa_cashier",
  "casa_barber",
  "casa_viewer",
  "spa_owner",
  "spa_admin",
  "spa_reception",
  "spa_cashier",
  "spa_therapist",
  "spa_viewer",
];

const ids = {
  platform: Object.fromEntries(roleKeys.map((role) => [role, randomUUID()])),
  identities: Object.fromEntries(roleKeys.map((role) => [role, randomUUID()])),
  casa: {
    business: randomUUID(),
    services: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
    products: [randomUUID(), randomUUID(), randomUUID()],
    staff: [randomUUID(), randomUUID(), randomUUID()],
    customers: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
    bookings: [randomUUID(), randomUUID()],
    queue: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
    resources: [randomUUID(), randomUUID()],
    supplier: randomUUID(),
    expenses: [randomUUID(), randomUUID()],
    wallet: randomUUID(),
    package: randomUUID(),
    customerPackage: randomUUID(),
    packageBenefits: [randomUUID(), randomUUID()],
    membership: randomUUID(),
    discount: randomUUID(),
    cashierOpen: randomUUID(),
    cashierClosed: randomUUID(),
    tx: [randomUUID(), randomUUID(), randomUUID()],
    txItems: [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()],
  },
  spa: {
    business: randomUUID(),
    services: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
    products: [randomUUID(), randomUUID(), randomUUID()],
    staff: [randomUUID(), randomUUID(), randomUUID()],
    customers: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
    bookings: [randomUUID(), randomUUID()],
    queue: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
    resources: [randomUUID(), randomUUID(), randomUUID()],
    supplier: randomUUID(),
    expenses: [randomUUID(), randomUUID()],
    wallet: randomUUID(),
    package: randomUUID(),
    customerPackage: randomUUID(),
    packageBenefits: [randomUUID(), randomUUID()],
    membership: randomUUID(),
    discount: randomUUID(),
    cashierOpen: randomUUID(),
    cashierClosed: randomUUID(),
    tx: [randomUUID(), randomUUID(), randomUUID()],
    txItems: [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()],
  },
};

const today = new Date();
const yyyyMmDd = today.toISOString().slice(0, 10);
const receiptDate = yyyyMmDd.replaceAll("-", "");

async function query(sql, params = []) {
  return pool.query(sql, params);
}

function demoEmail(role) {
  return `${runId}-${role.replaceAll("_", "-")}@example.test`;
}

function slug(text) {
  return `${runId}-${text}`;
}

function isoAt(hour, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function queueNumber(config, offset) {
  return config.queueBase + offset;
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function cleanup(targetRunId) {
  const users = await query("SELECT id FROM auth.users WHERE email LIKE $1", [
    `${targetRunId}-%@example.test`,
  ]);
  const userIds = users.rows.map((row) => row.id);
  const businesses = await query("SELECT id FROM public.businesses WHERE slug LIKE $1", [
    `${targetRunId}-%`,
  ]);
  const businessIds = businesses.rows.map((row) => row.id);

  if (businessIds.length > 0) {
    await query("SELECT set_config('casa.checkout_mutation', 'true', false)");
    await query(
      `
      UPDATE public.bookings
      SET checkout_transaction_id = NULL,
          checked_out_by = NULL,
          checked_out_at = NULL
      WHERE business_id = ANY($1::uuid[])
      `,
      [businessIds],
    );
    await query(
      `
      UPDATE public.queue_tickets
      SET checkout_transaction_id = NULL,
          checkout_completed_at = NULL
      WHERE business_id = ANY($1::uuid[])
      `,
      [businessIds],
    );
    await query(
      `
      DELETE FROM public.financial_ledger_entries
      WHERE business_id = ANY($1::uuid[])
      `,
      [businessIds],
    );
    await query(
      "DELETE FROM public.product_inventory_movements WHERE business_id = ANY($1::uuid[])",
      [businessIds],
    );
    await query(
      "DELETE FROM public.checkout_transaction_items WHERE business_id = ANY($1::uuid[])",
      [businessIds],
    );
    await query("DELETE FROM public.checkout_transactions WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query(
      "DELETE FROM public.checkout_receipt_counters WHERE business_id = ANY($1::uuid[])",
      [businessIds],
    );
    await query("DELETE FROM public.cashier_sessions WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.expenses WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.suppliers WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query(
      "DELETE FROM public.customer_package_benefits WHERE customer_package_id IN (SELECT id FROM public.customer_packages WHERE business_id = ANY($1::uuid[]))",
      [businessIds],
    );
    await query("DELETE FROM public.customer_packages WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query(
      "DELETE FROM public.package_services WHERE package_id IN (SELECT id FROM public.packages WHERE business_id = ANY($1::uuid[]))",
      [businessIds],
    );
    await query("DELETE FROM public.packages WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.user_wallets WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.wallets WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.memberships WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.discounts WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.queue_tickets WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.booking_items WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.bookings WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.customers WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.products WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.resources WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.services WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.business_memberships WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.business_modules WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.business_working_days WHERE business_id = ANY($1::uuid[])", [
      businessIds,
    ]);
    await query("DELETE FROM public.barbers WHERE business_id = ANY($1::uuid[])", [businessIds]);
    await query("DELETE FROM public.businesses WHERE id = ANY($1::uuid[])", [businessIds]);
    await query("SELECT set_config('casa.checkout_mutation', 'false', false)");
  }

  if (userIds.length > 0) {
    await query("DELETE FROM public.business_memberships WHERE user_id = ANY($1::uuid[])", [
      userIds,
    ]);
    await query("DELETE FROM public.user_roles WHERE user_id = ANY($1::uuid[])", [userIds]);
    await query("DELETE FROM auth.identities WHERE user_id = ANY($1::uuid[])", [userIds]);
    await query("DELETE FROM auth.users WHERE id = ANY($1::uuid[])", [userIds]);
  }

  return { businesses: businessIds.length, authUsers: userIds.length };
}

async function verify(targetRunId) {
  const businesses = await query(
    `
    SELECT id, slug, name_en, business_type
    FROM public.businesses
    WHERE slug LIKE $1
    ORDER BY slug
    `,
    [`${targetRunId}-%`],
  );
  const businessIds = businesses.rows.map((row) => row.id);
  const users = await query("SELECT email FROM auth.users WHERE email LIKE $1 ORDER BY email", [
    `${targetRunId}-%@example.test`,
  ]);

  if (businessIds.length === 0) {
    return { runId: targetRunId, businesses: [], authUsers: users.rows.length };
  }

  const countTables = [
    "business_working_days",
    "business_modules",
    "business_memberships",
    "barbers",
    "services",
    "products",
    "customers",
    "bookings",
    "booking_items",
    "queue_tickets",
    "resources",
    "cashier_sessions",
    "checkout_transactions",
    "checkout_transaction_items",
    "financial_ledger_entries",
    "product_inventory_movements",
    "wallets",
    "user_wallets",
    "packages",
    "customer_packages",
    "memberships",
    "discounts",
    "suppliers",
    "expenses",
  ];
  const counts = {};
  for (const table of countTables) {
    const result = await query(
      `SELECT count(*)::int AS count FROM public.${table} WHERE business_id = ANY($1::uuid[])`,
      [businessIds],
    );
    counts[table] = result.rows[0].count;
  }

  const packageServices = await query(
    `
    SELECT count(*)::int AS count
    FROM public.package_services ps
    JOIN public.packages p ON p.id = ps.package_id
    WHERE p.business_id = ANY($1::uuid[])
    `,
    [businessIds],
  );
  const packageBenefits = await query(
    `
    SELECT count(*)::int AS count
    FROM public.customer_package_benefits cpb
    JOIN public.customer_packages cp ON cp.id = cpb.customer_package_id
    WHERE cp.business_id = ANY($1::uuid[])
    `,
    [businessIds],
  );

  return {
    runId: targetRunId,
    businesses: businesses.rows,
    authUsers: users.rows.length,
    counts: {
      ...counts,
      package_services: packageServices.rows[0].count,
      customer_package_benefits: packageBenefits.rows[0].count,
    },
  };
}

async function createAuthUsers() {
  for (const role of roleKeys) {
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
        jsonb_build_object('email_verified', true, 'owner_demo_run_id', $4::text),
        false,
        false,
        now(),
        now()
      )
      `,
      [ids.platform[role], demoEmail(role), demoPassword, runId],
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
      [ids.identities[role], ids.platform[role], demoEmail(role)],
    );
  }

  await query("INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'platform_admin')", [
    ids.platform.platform_admin,
  ]);
}

async function createBusiness(kind, config) {
  const data = ids[kind];
  await query(
    `
    INSERT INTO public.businesses (
      id, slug, name_en, name_ar, business_type, business_model, status, default_locale,
      timezone, currency, description_en, description_ar, phone, whatsapp_number, email,
      address_en, address_ar, city, area, country, accent_color, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, 'single_branch', 'active', 'en',
      'Asia/Dubai', 'AED', $6, $7, '+971544767690', '+971544767690', $8,
      $9, $10, 'Dubai', $11, 'UAE', '#fe0a00', now()
    )
    `,
    [
      data.business,
      config.slug,
      config.nameEn,
      config.nameAr,
      config.type,
      config.descriptionEn,
      config.descriptionAr,
      `${runId}-${kind}@example.test`,
      config.addressEn,
      config.addressAr,
      config.area,
    ],
  );

  await query(
    `
    INSERT INTO public.business_working_days (business_id, day_of_week, is_active, open_time, close_time)
    SELECT $1, day, day <> 5, '10:00'::time, '22:00'::time
    FROM generate_series(0, 6) AS day
    `,
    [data.business],
  );

  for (const moduleKey of moduleKeys) {
    await query(
      `
      INSERT INTO public.business_modules (business_id, module_key, enabled, updated_at)
      VALUES ($1, $2, true, now())
      `,
      [data.business, moduleKey],
    );
  }

  await query(
    `
    INSERT INTO public.resources (id, business_id, name_en, name_ar, resource_type, status, capacity, sort_order)
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid,
      business_id uuid,
      name_en text,
      name_ar text,
      resource_type text,
      status text,
      capacity integer,
      sort_order integer
    )
    `,
    [
      JSON.stringify(
        config.resources.map((resource, index) => ({
          id: data.resources[index],
          business_id: data.business,
          ...resource,
          status: "active",
          capacity: 1,
          sort_order: index + 1,
        })),
      ),
    ],
  );

  await query(
    `
    INSERT INTO public.services (
      id, business_id, slug_en, slug_ar, title_en, title_ar, short_description_en,
      short_description_ar, description_en, description_ar, price, duration_minutes,
      default_duration_min, default_duration_max, buffer_minutes, is_active
    )
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid,
      business_id uuid,
      slug_en text,
      slug_ar text,
      title_en text,
      title_ar text,
      short_description_en text,
      short_description_ar text,
      description_en text,
      description_ar text,
      price numeric,
      duration_minutes integer,
      default_duration_min integer,
      default_duration_max integer,
      buffer_minutes integer,
      is_active boolean
    )
    `,
    [
      JSON.stringify(
        config.services.map((service, index) => ({
          id: data.services[index],
          business_id: data.business,
          slug_en: slug(`${kind}-${service.slug}`),
          slug_ar: slug(`${kind}-${service.slug}-ar`),
          short_description_en: service.descEn,
          short_description_ar: service.descAr,
          description_en: service.descEn,
          description_ar: service.descAr,
          default_duration_min: Math.max(5, service.duration_minutes - 10),
          default_duration_max: service.duration_minutes + 10,
          buffer_minutes: 5,
          is_active: true,
          ...service,
        })),
      ),
    ],
  );

  await query(
    `
    INSERT INTO public.products (
      id, business_id, slug_en, slug_ar, name_en, name_ar, description_en,
      description_ar, price, stock_quantity, whatsapp_order_text_en, whatsapp_order_text_ar,
      is_active
    )
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid,
      business_id uuid,
      slug_en text,
      slug_ar text,
      name_en text,
      name_ar text,
      description_en text,
      description_ar text,
      price numeric,
      stock_quantity integer,
      whatsapp_order_text_en text,
      whatsapp_order_text_ar text,
      is_active boolean
    )
    `,
    [
      JSON.stringify(
        config.products.map((product, index) => ({
          id: data.products[index],
          business_id: data.business,
          slug_en: slug(`${kind}-${product.slug}`),
          slug_ar: slug(`${kind}-${product.slug}-ar`),
          whatsapp_order_text_en: `Hi ${config.shortName}, I want to order ${product.name_en}.`,
          whatsapp_order_text_ar: `مرحباً ${config.shortNameAr}، أريد طلب ${product.name_ar}.`,
          is_active: true,
          ...product,
        })),
      ),
    ],
  );

  await query(
    `
    INSERT INTO public.barbers (id, business_id, name_en, name_ar, bio_en, bio_ar, phone, is_active)
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid,
      business_id uuid,
      name_en text,
      name_ar text,
      bio_en text,
      bio_ar text,
      phone text,
      is_active boolean
    )
    `,
    [
      JSON.stringify(
        config.staff.map((staff, index) => ({
          id: data.staff[index],
          business_id: data.business,
          is_active: true,
          ...staff,
        })),
      ),
    ],
  );
}

async function seedAccess(kind, rolePrefix) {
  const data = ids[kind];
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
      data.business,
      ids.platform[`${rolePrefix}_owner`],
      ids.platform[`${rolePrefix}_admin`],
      ids.platform[`${rolePrefix}_reception`],
      ids.platform[`${rolePrefix}_cashier`],
      ids.platform[rolePrefix === "casa" ? "casa_barber" : "spa_therapist"],
      data.staff[0],
      ids.platform[`${rolePrefix}_viewer`],
    ],
  );
}

async function seedOperations(kind, config, rolePrefix) {
  const data = ids[kind];
  const cashierUser = ids.platform[`${rolePrefix}_cashier`];
  const closedSession = data.cashierClosed;
  const openSession = data.cashierOpen;

  await query(
    `
    INSERT INTO public.customers (id, business_id, full_name, phone, email, preferred_language, updated_at)
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid,
      business_id uuid,
      full_name text,
      phone text,
      email text,
      preferred_language text,
      updated_at timestamptz
    )
    `,
    [
      JSON.stringify(
        config.customers.map((customer, index) => ({
          id: data.customers[index],
          business_id: data.business,
          email: `${runId}-${kind}-customer-${index + 1}@example.test`,
          preferred_language: index % 2 === 0 ? "en" : "ar",
          updated_at: new Date().toISOString(),
          ...customer,
        })),
      ),
    ],
  );

  await query(
    `
    INSERT INTO public.bookings (
      id, business_id, customer_id, service_id, barber_id, customer_name, customer_phone,
      booking_date, booking_time, status, language, notes, checkout_status
    )
    VALUES
      ($1, $2, $3, $5, $7, $9, $10, CURRENT_DATE, '14:00', 'confirmed', 'en', $11, 'pending'),
      ($4, $2, $6, $8, $7, $12, $13, CURRENT_DATE + 1, '16:30', 'pending', 'ar', $14, 'pending')
    `,
    [
      data.bookings[0],
      data.business,
      data.customers[0],
      data.bookings[1],
      data.services[0],
      data.customers[1],
      data.staff[0],
      data.services[1],
      config.customers[0].full_name,
      config.customers[0].phone,
      `${runId}:confirmed booking`,
      config.customers[1].full_name,
      config.customers[1].phone,
      `${runId}:pending booking`,
    ],
  );

  await query(
    `
    INSERT INTO public.booking_items (
      business_id, booking_id, service_id, barber_id, resource_id, starts_at, ends_at,
      status, price, duration_minutes, commission_amount, tip_amount, notes
    )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9, 25, 10, $10),
      ($1, $11, $12, $4, $13, $14, $15, 'pending', $16, $17, 0, 0, $18)
    `,
    [
      data.business,
      data.bookings[0],
      data.services[0],
      data.staff[0],
      data.resources[0],
      isoAt(14),
      isoAt(14, config.services[0].duration_minutes),
      config.services[0].price,
      config.services[0].duration_minutes,
      `${runId}:confirmed booking item`,
      data.bookings[1],
      data.services[1],
      data.resources[1],
      isoAt(16, 30),
      isoAt(17, 30),
      config.services[1].price,
      config.services[1].duration_minutes,
      `${runId}:pending booking item`,
    ],
  );

  await query(
    `
    INSERT INTO public.queue_tickets (
      id, business_id, customer_id, service_id, barber_id, customer_name, customer_phone,
      queue_date, queue_number, mode, status, estimated_wait_min, estimated_wait_max,
      estimated_start_time, prediction_confidence, called_at, started_at, completed_at,
      actual_service_minutes, language, notes, service_completed_at, checkout_required
    )
    VALUES
      ($1, $5, $6, $10, $14, $18, $22, CURRENT_DATE, $30, 'specific_barber', 'in_service', 0, 10, now() + interval '5 minutes', 'medium', now() - interval '20 minutes', now() - interval '15 minutes', NULL, NULL, 'en', $26, NULL, true),
      ($2, $5, $7, $11, $15, $19, $23, CURRENT_DATE, $31, 'specific_barber', 'called', 10, 20, now() + interval '15 minutes', 'medium', now() - interval '4 minutes', NULL, NULL, NULL, 'ar', $27, NULL, true),
      ($3, $5, $8, $12, $16, $20, $24, CURRENT_DATE, $32, 'any_barber', 'waiting', 25, 40, now() + interval '30 minutes', 'low', NULL, NULL, NULL, NULL, 'en', $28, NULL, true),
      ($4, $5, $9, $13, $17, $21, $25, CURRENT_DATE, $33, 'specific_barber', 'ready_for_checkout', 0, 0, now(), 'high', now() - interval '90 minutes', now() - interval '75 minutes', now() - interval '15 minutes', 60, 'en', $29, now() - interval '15 minutes', true)
    `,
    [
      data.queue[0],
      data.queue[1],
      data.queue[2],
      data.queue[3],
      data.business,
      data.customers[0],
      data.customers[1],
      data.customers[2],
      data.customers[3],
      data.services[0],
      data.services[1],
      data.services[2],
      data.services[3],
      data.staff[0],
      data.staff[1],
      data.staff[2],
      data.staff[0],
      config.customers[0].full_name,
      config.customers[1].full_name,
      config.customers[2].full_name,
      config.customers[3].full_name,
      config.customers[0].phone,
      config.customers[1].phone,
      config.customers[2].phone,
      config.customers[3].phone,
      `${runId}:now serving`,
      `${runId}:called`,
      `${runId}:waiting`,
      `${runId}:ready for checkout`,
      queueNumber(config, 1),
      queueNumber(config, 2),
      queueNumber(config, 3),
      queueNumber(config, 4),
    ],
  );

  await query(
    `
    INSERT INTO public.suppliers (id, business_id, name, email, phone, description)
    VALUES ($1, $2, $3, $4, '+971500009999', $5)
    `,
    [
      data.supplier,
      data.business,
      config.supplier.name,
      `${runId}-${kind}-supplier@example.test`,
      `${runId}: ${config.supplier.description}`,
    ],
  );

  await query(
    `
    INSERT INTO public.expenses (id, business_id, supplier_id, expense_name, payee, amount, payment_type, date, notes)
    VALUES
      ($1, $3, $4, $5, $7, $9, 'one_time', CURRENT_DATE, $11),
      ($2, $3, NULL, $6, $8, $10, 'monthly', CURRENT_DATE - 1, $12)
    `,
    [
      data.expenses[0],
      data.expenses[1],
      data.business,
      data.supplier,
      config.expenses[0].name,
      config.expenses[1].name,
      config.supplier.name,
      "Utilities",
      config.expenses[0].amount,
      config.expenses[1].amount,
      `${runId}:supplier expense`,
      `${runId}:operating expense`,
    ],
  );

  await query(
    `
    INSERT INTO public.wallets (id, business_id, code, amount, invoiced_amount, status, starts_at, ends_at)
    VALUES ($1, $2, $3, 350, 500, 'active', CURRENT_DATE - 1, CURRENT_DATE + 60)
    `,
    [data.wallet, data.business, `${runId}-${kind}-WALLET`],
  );
  await query(
    `
    INSERT INTO public.user_wallets (business_id, wallet_id, staff_id, amount, invoiced_amount, commission_percent)
    VALUES ($1, $2, $3, 350, 500, 10)
    `,
    [data.business, data.wallet, data.staff[0]],
  );

  await query(
    `
    INSERT INTO public.packages (id, business_id, name_en, name_ar, description_en, description_ar, price, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `,
    [
      data.package,
      data.business,
      config.package.nameEn,
      config.package.nameAr,
      `${runId}: ${config.package.nameEn}`,
      `${runId}: ${config.package.nameAr}`,
      config.package.price,
    ],
  );
  await query(
    `
    INSERT INTO public.package_services (package_id, service_id, quantity)
    VALUES ($1, $2, 3), ($1, $3, 2)
    `,
    [data.package, data.services[0], data.services[1]],
  );
  await query(
    `
    INSERT INTO public.customer_packages (id, business_id, customer_name, customer_phone, package_id, price_paid, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'active')
    `,
    [
      data.customerPackage,
      data.business,
      config.customers[2].full_name,
      config.customers[2].phone,
      data.package,
      config.package.price,
    ],
  );
  await query(
    `
    INSERT INTO public.customer_package_benefits (
      id, customer_package_id, service_id, total_quantity, remaining_quantity
    )
    VALUES ($1, $3, $4, 3, 2), ($2, $3, $5, 2, 1)
    `,
    [
      data.packageBenefits[0],
      data.packageBenefits[1],
      data.customerPackage,
      data.services[0],
      data.services[1],
    ],
  );

  await query(
    `
    INSERT INTO public.memberships (id, business_id, membership_no, discount_percent, starts_at, ends_at, status)
    VALUES ($1, $2, $3, 15, CURRENT_DATE - 1, CURRENT_DATE + 365, 'active')
    `,
    [data.membership, data.business, `${runId}-${kind}-VIP`],
  );
  await query(
    `
    INSERT INTO public.discounts (id, business_id, code, type, amount, starts_at, ends_at, status, using_type, benefit_numbers)
    VALUES ($1, $2, $3, 'percentage', 20, CURRENT_DATE - 1, CURRENT_DATE + 30, 'active', 'limited_quantity', 25)
    `,
    [data.discount, data.business, `${runId}-${kind}-WELCOME20`],
  );

  await query(
    `
    INSERT INTO public.cashier_sessions (
      id, business_id, opened_by, opened_at, closed_by, closed_at, opening_cash,
      expected_cash, actual_cash, variance, status, notes
    )
    VALUES
      ($1, $3, $4, now() - interval '1 day', $4, now() - interval '18 hours', 300, 920, 915, -5, 'closed', $5),
      ($2, $3, $4, now() - interval '2 hours', NULL, NULL, 250, 610, 0, 0, 'open', $6)
    `,
    [
      closedSession,
      openSession,
      data.business,
      cashierUser,
      `${runId}:closed cashier session`,
      `${runId}:active cashier session`,
    ],
  );

  await seedFinancials(kind, config, cashierUser, closedSession);
}

async function seedFinancials(kind, config, cashierUser, cashierSession) {
  const data = ids[kind];
  const receiptPrefix = `CASA-${receiptDate}`;
  const serviceTx = data.tx[0];
  const productTx = data.tx[1];
  const refundTx = data.tx[2];

  await query(
    `
    INSERT INTO public.checkout_receipt_counters (business_id, receipt_date, last_sequence, updated_at)
    VALUES ($1, $2::date, 3, now())
    ON CONFLICT (business_id, receipt_date)
    DO UPDATE SET last_sequence = GREATEST(public.checkout_receipt_counters.last_sequence, 3), updated_at = now()
    `,
    [data.business, yyyyMmDd],
  );

  await query(
    `
    INSERT INTO public.checkout_transactions (
      id, business_id, booking_id, queue_ticket_id, customer_id, subtotal, discount_amount,
      wallet_amount, package_amount, membership_amount, tips_amount, tax_amount, total_amount,
      refunded_amount, refund_status, service_status, payment_status, payments, receipt_number,
      notes, created_by, created_at, cashier_session_id, transaction_type, customer_snapshot,
      payment_snapshot, discount_snapshot, source_snapshot
    )
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid,
      business_id uuid,
      booking_id uuid,
      queue_ticket_id uuid,
      customer_id uuid,
      subtotal numeric,
      discount_amount numeric,
      wallet_amount numeric,
      package_amount numeric,
      membership_amount numeric,
      tips_amount numeric,
      tax_amount numeric,
      total_amount numeric,
      refunded_amount numeric,
      refund_status text,
      service_status text,
      payment_status text,
      payments jsonb,
      receipt_number text,
      notes text,
      created_by uuid,
      created_at timestamptz,
      cashier_session_id uuid,
      transaction_type text,
      customer_snapshot jsonb,
      payment_snapshot jsonb,
      discount_snapshot jsonb,
      source_snapshot jsonb
    )
    `,
    [
      JSON.stringify([
        {
          id: serviceTx,
          business_id: data.business,
          booking_id: data.bookings[0],
          queue_ticket_id: null,
          customer_id: data.customers[0],
          subtotal: config.services[0].price,
          discount_amount: 20,
          wallet_amount: 0,
          package_amount: 0,
          membership_amount: 0,
          tips_amount: 25,
          tax_amount: 0,
          total_amount: config.services[0].price + 5,
          refunded_amount: 0,
          refund_status: "none",
          service_status: "completed",
          payment_status: "completed",
          payments: [{ method: "cash", amount: config.services[0].price + 5 }],
          receipt_number: `${receiptPrefix}-000001`,
          notes: `${runId}:${kind}:service checkout`,
          created_by: cashierUser,
          created_at: hoursAgo(24),
          cashier_session_id: cashierSession,
          transaction_type: "sale",
          customer_snapshot: {
            customer_id: data.customers[0],
            name: config.customers[0].full_name,
          },
          payment_snapshot: {
            payments: [{ method: "cash", amount: config.services[0].price + 5 }],
          },
          discount_snapshot: {
            code: `${runId}-${kind}-WELCOME20`,
            type: "percentage",
            applied_amount: 20,
          },
          source_snapshot: { source: "booking", run_id: runId },
        },
        {
          id: productTx,
          business_id: data.business,
          booking_id: null,
          queue_ticket_id: data.queue[3],
          customer_id: data.customers[3],
          subtotal: config.products[0].price * 2,
          discount_amount: 0,
          wallet_amount: 0,
          package_amount: 0,
          membership_amount: 0,
          tips_amount: 0,
          tax_amount: 0,
          total_amount: config.products[0].price * 2,
          refunded_amount: 45,
          refund_status: "partial",
          service_status: "completed",
          payment_status: "completed",
          payments: [{ method: "card", amount: config.products[0].price * 2 }],
          receipt_number: `${receiptPrefix}-000002`,
          notes: `${runId}:${kind}:product checkout`,
          created_by: cashierUser,
          created_at: hoursAgo(5),
          cashier_session_id: cashierSession,
          transaction_type: "sale",
          customer_snapshot: {
            customer_id: data.customers[3],
            name: config.customers[3].full_name,
          },
          payment_snapshot: {
            payments: [{ method: "card", amount: config.products[0].price * 2 }],
          },
          discount_snapshot: {},
          source_snapshot: { source: "product_pos", run_id: runId },
        },
        {
          id: refundTx,
          business_id: data.business,
          booking_id: null,
          queue_ticket_id: null,
          customer_id: data.customers[1],
          subtotal: 45,
          discount_amount: 0,
          wallet_amount: 0,
          package_amount: 0,
          membership_amount: 0,
          tips_amount: 0,
          tax_amount: 0,
          total_amount: 45,
          refunded_amount: 0,
          refund_status: "none",
          service_status: "completed",
          payment_status: "refunded",
          payments: [{ method: "card", amount: 45 }],
          receipt_number: `${receiptPrefix}-000003`,
          notes: `${runId}:${kind}:partial refund`,
          created_by: cashierUser,
          created_at: hoursAgo(4),
          cashier_session_id: cashierSession,
          transaction_type: "refund",
          customer_snapshot: {
            customer_id: data.customers[1],
            name: config.customers[1].full_name,
          },
          payment_snapshot: { payments: [{ method: "card", amount: 45 }] },
          discount_snapshot: {},
          source_snapshot: { source: "refund", original_transaction_id: productTx, run_id: runId },
        },
      ]),
    ],
  );

  await query(
    `
    INSERT INTO public.checkout_transaction_items (
      id, transaction_id, business_id, type, staff_id, name, qty, unit_price, discount,
      total, service_snapshot, product_snapshot, staff_snapshot, commission_amount, tip_amount
    )
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid,
      transaction_id uuid,
      business_id uuid,
      type text,
      staff_id uuid,
      name text,
      qty integer,
      unit_price numeric,
      discount numeric,
      total numeric,
      service_snapshot jsonb,
      product_snapshot jsonb,
      staff_snapshot jsonb,
      commission_amount numeric,
      tip_amount numeric
    )
    `,
    [
      JSON.stringify([
        {
          id: data.txItems[0],
          transaction_id: serviceTx,
          business_id: data.business,
          type: "service",
          staff_id: data.staff[0],
          name: config.services[0].title_en,
          qty: 1,
          unit_price: config.services[0].price,
          discount: 20,
          total: config.services[0].price - 20,
          service_snapshot: {
            id: data.services[0],
            name: config.services[0].title_en,
            run_id: runId,
          },
          product_snapshot: null,
          staff_snapshot: { id: data.staff[0], name: config.staff[0].name_en, run_id: runId },
          commission_amount: 30,
          tip_amount: 25,
        },
        {
          id: data.txItems[1],
          transaction_id: productTx,
          business_id: data.business,
          type: "product",
          staff_id: data.staff[0],
          name: config.products[0].name_en,
          qty: 2,
          unit_price: config.products[0].price,
          discount: 0,
          total: config.products[0].price * 2,
          service_snapshot: null,
          product_snapshot: {
            id: data.products[0],
            name: config.products[0].name_en,
            run_id: runId,
          },
          staff_snapshot: { id: data.staff[0], name: config.staff[0].name_en, run_id: runId },
          commission_amount: 0,
          tip_amount: 0,
        },
        {
          id: data.txItems[2],
          transaction_id: serviceTx,
          business_id: data.business,
          type: "tip",
          staff_id: data.staff[0],
          name: "Tip",
          qty: 1,
          unit_price: 25,
          discount: 0,
          total: 25,
          service_snapshot: null,
          product_snapshot: null,
          staff_snapshot: { id: data.staff[0], name: config.staff[0].name_en, run_id: runId },
          commission_amount: 0,
          tip_amount: 25,
        },
        {
          id: data.txItems[3],
          transaction_id: refundTx,
          business_id: data.business,
          type: "product",
          staff_id: data.staff[0],
          name: "Partial product refund",
          qty: 1,
          unit_price: 45,
          discount: 0,
          total: 45,
          service_snapshot: null,
          product_snapshot: {
            id: data.products[0],
            name: config.products[0].name_en,
            run_id: runId,
          },
          staff_snapshot: { id: data.staff[0], name: config.staff[0].name_en, run_id: runId },
          commission_amount: 0,
          tip_amount: 0,
        },
      ]),
    ],
  );

  await query(
    `
    INSERT INTO public.financial_ledger_entries (
      business_id, checkout_transaction_id, entry_type, amount, direction, category
    )
    VALUES
      ($1, $2, 'sale', $5, 'credit', 'service'),
      ($1, $2, 'tip', 25, 'credit', 'tip'),
      ($1, $2, 'commission', 30, 'debit', 'commission'),
      ($1, $3, 'sale', $6, 'credit', 'product'),
      ($1, $4, 'refund', 45, 'debit', 'refund')
    `,
    [
      data.business,
      serviceTx,
      productTx,
      refundTx,
      config.services[0].price - 20,
      config.products[0].price * 2,
    ],
  );

  await query(
    `
    INSERT INTO public.product_inventory_movements (
      business_id, product_id, checkout_transaction_id, qty_delta, movement_type, created_by
    )
    VALUES
      ($1, $2, $3, -2, 'sale', $5),
      ($1, $2, $4, 1, 'refund', $5)
    `,
    [data.business, data.products[0], productTx, refundTx, cashierUser],
  );
  await query("UPDATE public.products SET stock_quantity = stock_quantity - 1 WHERE id = $1", [
    data.products[0],
  ]);

  await query(
    "UPDATE public.bookings SET checkout_status = 'completed', checkout_transaction_id = $1, checked_out_at = now() - interval '1 day', checked_out_by = $2 WHERE id = $3",
    [serviceTx, cashierUser, data.bookings[0]],
  );
  await query(
    "UPDATE public.queue_tickets SET status = 'completed', checkout_completed_at = now() - interval '5 hours', checkout_transaction_id = $1 WHERE id = $2",
    [productTx, data.queue[3]],
  );
}

const casaConfig = {
  slug: slug("casa-gents"),
  nameEn: "Casa Gents Salon Demo",
  nameAr: "كازا صالون رجالي تجريبي",
  shortName: "Casa",
  shortNameAr: "كازا",
  type: "gents_salon",
  queueBase: 9100,
  descriptionEn: "Demo gents salon tenant for owner walkthroughs.",
  descriptionAr: "منشأة تجريبية لعرض صالون رجالي للمالك.",
  addressEn: "City Centre, Ajman",
  addressAr: "سيتي سنتر، عجمان",
  area: "Ajman",
  resources: [
    { name_en: "Chair 1", name_ar: "الكرسي 1", resource_type: "chair" },
    { name_en: "VIP Chair", name_ar: "كرسي VIP", resource_type: "chair" },
  ],
  services: [
    {
      slug: "classic-haircut",
      title_en: "Classic Haircut",
      title_ar: "قص شعر كلاسيكي",
      descEn: "Precision haircut with styling finish.",
      descAr: "قص شعر دقيق مع تصفيف نهائي.",
      price: 120,
      duration_minutes: 40,
    },
    {
      slug: "beard-trim",
      title_en: "Beard Trim",
      title_ar: "تهذيب اللحية",
      descEn: "Beard shaping, line-up, and finishing oil.",
      descAr: "تشكيل اللحية وتحديدها مع زيت نهائي.",
      price: 80,
      duration_minutes: 25,
    },
    {
      slug: "haircut-beard",
      title_en: "Haircut + Beard",
      title_ar: "قص الشعر واللحية",
      descEn: "Complete grooming session for the day.",
      descAr: "جلسة عناية كاملة لليوم.",
      price: 180,
      duration_minutes: 65,
    },
    {
      slug: "facial-care",
      title_en: "Facial Care",
      title_ar: "عناية الوجه",
      descEn: "Refreshing facial care for men.",
      descAr: "عناية منعشة للوجه للرجال.",
      price: 160,
      duration_minutes: 45,
    },
  ],
  products: [
    {
      slug: "matte-clay",
      name_en: "Casa Matte Clay",
      name_ar: "كازا مات كلاي",
      description_en: "Strong hold, natural finish styling clay.",
      description_ar: "كلاي تثبيت قوي بلمسة طبيعية.",
      price: 85,
      stock_quantity: 24,
    },
    {
      slug: "beard-oil",
      name_en: "Beard Oil",
      name_ar: "زيت اللحية",
      description_en: "Softens and nourishes beard hair.",
      description_ar: "ينعم ويغذي شعر اللحية.",
      price: 65,
      stock_quantity: 18,
    },
    {
      slug: "aftershave-balm",
      name_en: "Aftershave Balm",
      name_ar: "بلسم بعد الحلاقة",
      description_en: "Cooling balm for post-shave comfort.",
      description_ar: "بلسم منعش لراحة ما بعد الحلاقة.",
      price: 70,
      stock_quantity: 16,
    },
  ],
  staff: [
    {
      name_en: "Omar Al Mansoori",
      name_ar: "عمر المنصوري",
      bio_en: "Senior barber specializing in classic cuts.",
      bio_ar: "حلاق أول متخصص في القصات الكلاسيكية.",
      phone: "+971500001010",
    },
    {
      name_en: "Karim Haddad",
      name_ar: "كريم حداد",
      bio_en: "Beard and grooming specialist.",
      bio_ar: "أخصائي اللحية والعناية.",
      phone: "+971500001011",
    },
    {
      name_en: "Yousef Nasser",
      name_ar: "يوسف ناصر",
      bio_en: "Fast, polished cuts for busy guests.",
      bio_ar: "قصات سريعة ومتقنة للضيوف المشغولين.",
      phone: "+971500001012",
    },
  ],
  customers: [
    { full_name: "Demo Ahmed Salem", phone: "971500101001" },
    { full_name: "Demo Khalid Noor", phone: "971500101002" },
    { full_name: "Demo Saeed Ali", phone: "971500101003" },
    { full_name: "Demo Faisal Omar", phone: "971500101004" },
  ],
  supplier: { name: "Gents Grooming Supplies", description: "Demo supplier for grooming stock." },
  expenses: [
    { name: "Grooming product restock", amount: 420 },
    { name: "Salon cleaning service", amount: 180 },
  ],
  package: { nameEn: "Grooming Bundle", nameAr: "باقة العناية الرجالية", price: 520 },
};

const spaConfig = {
  slug: slug("spa"),
  nameEn: "Serenity Spa Demo",
  nameAr: "سبا سيرينيتي التجريبي",
  shortName: "Serenity Spa",
  shortNameAr: "سبا سيرينيتي",
  type: "spa",
  queueBase: 9200,
  descriptionEn: "Demo spa tenant showing therapist terminology and treatment-room operations.",
  descriptionAr: "منشأة سبا تجريبية تعرض مصطلحات المعالجين وتشغيل غرف العلاج.",
  addressEn: "Jumeirah Wellness District, Dubai",
  addressAr: "منطقة جميرا للعافية، دبي",
  area: "Jumeirah",
  resources: [
    { name_en: "Treatment Room 1", name_ar: "غرفة العلاج 1", resource_type: "treatment_room" },
    { name_en: "Massage Room 2", name_ar: "غرفة المساج 2", resource_type: "massage_room" },
    { name_en: "Facial Suite", name_ar: "جناح العناية بالوجه", resource_type: "treatment_room" },
  ],
  services: [
    {
      slug: "massage-session",
      title_en: "Massage Session",
      title_ar: "جلسة مساج",
      descEn: "Restorative therapist-led massage session.",
      descAr: "جلسة مساج علاجية بإشراف معالج.",
      price: 260,
      duration_minutes: 60,
    },
    {
      slug: "facial-treatment",
      title_en: "Facial Treatment",
      title_ar: "علاج الوجه",
      descEn: "Hydrating facial treatment with premium products.",
      descAr: "علاج ترطيب للوجه باستخدام منتجات راقية.",
      price: 240,
      duration_minutes: 60,
    },
    {
      slug: "body-scrub",
      title_en: "Body Scrub",
      title_ar: "تقشير الجسم",
      descEn: "Full-body exfoliation and relaxation treatment.",
      descAr: "تقشير كامل للجسم مع جلسة استرخاء.",
      price: 320,
      duration_minutes: 75,
    },
    {
      slug: "relaxation-package",
      title_en: "Relaxation Package",
      title_ar: "باقة الاسترخاء",
      descEn: "Massage, scrub, and facial care bundle.",
      descAr: "باقة مساج وتقشير وعناية بالوجه.",
      price: 480,
      duration_minutes: 120,
    },
  ],
  products: [
    {
      slug: "lavender-oil",
      name_en: "Lavender Massage Oil",
      name_ar: "زيت مساج اللافندر",
      description_en: "Relaxing oil for massage aftercare.",
      description_ar: "زيت مهدئ للعناية بعد جلسة المساج.",
      price: 95,
      stock_quantity: 20,
    },
    {
      slug: "hydrating-mask",
      name_en: "Hydrating Face Mask",
      name_ar: "ماسك ترطيب الوجه",
      description_en: "Spa-grade hydrating mask.",
      description_ar: "ماسك ترطيب بجودة السبا.",
      price: 110,
      stock_quantity: 14,
    },
    {
      slug: "body-scrub-jar",
      name_en: "Body Scrub Jar",
      name_ar: "علبة مقشر الجسم",
      description_en: "Take-home body scrub jar.",
      description_ar: "علبة مقشر جسم للاستخدام المنزلي.",
      price: 130,
      stock_quantity: 12,
    },
  ],
  staff: [
    {
      name_en: "Maya Hassan",
      name_ar: "مايا حسن",
      bio_en: "Senior therapist for massage and relaxation treatments.",
      bio_ar: "معالجة أولى لجلسات المساج والاسترخاء.",
      phone: "+971500002010",
    },
    {
      name_en: "Nadine Farah",
      name_ar: "نادين فرح",
      bio_en: "Facial and skincare therapist.",
      bio_ar: "معالجة للعناية بالوجه والبشرة.",
      phone: "+971500002011",
    },
    {
      name_en: "Sara Mansour",
      name_ar: "سارة منصور",
      bio_en: "Body treatment and spa ritual specialist.",
      bio_ar: "أخصائية علاجات الجسم وطقوس السبا.",
      phone: "+971500002012",
    },
  ],
  customers: [
    { full_name: "Demo Lina Faris", phone: "971500202001" },
    { full_name: "Demo Noor Hamdan", phone: "971500202002" },
    { full_name: "Demo Mariam Saleh", phone: "971500202003" },
    { full_name: "Demo Salma Khalil", phone: "971500202004" },
  ],
  supplier: { name: "Spa Wellness Supplies", description: "Demo supplier for oils and spa stock." },
  expenses: [
    { name: "Massage oil restock", amount: 560 },
    { name: "Laundry and linen service", amount: 240 },
  ],
  package: { nameEn: "Relaxation Bundle", nameAr: "باقة الاسترخاء", price: 880 },
};

async function create() {
  await cleanup(runId);
  await createAuthUsers();
  await createBusiness("casa", casaConfig);
  await createBusiness("spa", spaConfig);
  await seedAccess("casa", "casa");
  await seedAccess("spa", "spa");
  await seedOperations("casa", casaConfig, "casa");
  await seedOperations("spa", spaConfig, "spa");

  console.log(
    JSON.stringify(
      {
        runId,
        password: demoPassword,
        businesses: [
          {
            label: "Casa Gents Salon Demo",
            slug: casaConfig.slug,
            business_id: ids.casa.business,
            terminology: "Barber",
          },
          {
            label: "Serenity Spa Demo",
            slug: spaConfig.slug,
            business_id: ids.spa.business,
            terminology: "Therapist",
          },
        ],
        users: roleKeys.map((role) => ({
          role,
          email: demoEmail(role),
        })),
        cleanup: `SUPABASE_DB_PASSWORD=... npm run demo:owner:cleanup -- ${runId}`,
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
  } else if (command === "verify") {
    console.log(JSON.stringify(await verify(runId), null, 2));
  } else {
    throw new Error(
      "Use: node scripts/owner-demo-seed.mjs create [runId] OR cleanup <runId> OR verify <runId>",
    );
  }
} finally {
  await pool.end();
}
