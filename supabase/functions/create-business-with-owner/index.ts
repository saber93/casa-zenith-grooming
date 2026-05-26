import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type BusinessPayload = Record<string, unknown> & {
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const generateTemporaryPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

const cleanString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Supabase function environment is not configured." }, 500);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json({ error: "Authentication is required." }, 401);
  }

  let payload: BusinessPayload;
  try {
    payload = (await request.json()) as BusinessPayload;
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const ownerName = cleanString(payload.owner_name);
  const ownerEmail = cleanString(payload.owner_email).toLowerCase();
  const ownerPhone = cleanString(payload.owner_phone);

  if (!ownerName || !ownerEmail) {
    return json({ error: "Owner name and email are required." }, 400);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();

  if (callerError || !caller) {
    return json({ error: "Invalid admin session." }, 401);
  }

  const { data: roleRows, error: roleError } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .in("role", ["admin", "platform_admin"])
    .limit(1);

  if (roleError || !roleRows?.length) {
    return json({ error: "Only admins can create owner accounts." }, 403);
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: createdUser, error: createUserError } = await serviceClient.auth.admin.createUser({
    email: ownerEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: ownerName,
      phone: ownerPhone || null,
      must_change_password: true,
      created_via: "business_onboarding",
    },
    app_metadata: {
      casa_role: "business_owner",
      must_change_password: true,
    },
  });

  if (createUserError || !createdUser.user) {
    const message = createUserError?.message ?? "Unable to create owner account.";
    const status = /already|registered|exists/i.test(message) ? 409 : 400;
    return json({ error: message }, status);
  }

  const ownerUserId = createdUser.user.id;
  const rollbackOwner = async () => {
    await serviceClient.auth.admin.deleteUser(ownerUserId);
  };

  const { data: businessResult, error: businessError } = await callerClient.rpc(
    "create_business_onboarding",
    {
      p_payload: {
        ...payload,
        owner_email: ownerEmail,
      },
    },
  );

  if (businessError) {
    await rollbackOwner();
    return json({ error: businessError.message }, 400);
  }

  const businessId = (businessResult as { business_id?: string } | null)?.business_id;
  if (!businessId) {
    await rollbackOwner();
    return json({ error: "Business creation did not return a business id." }, 500);
  }

  await serviceClient.auth.admin.updateUserById(ownerUserId, {
    app_metadata: {
      casa_role: "business_owner",
      business_id: businessId,
      business_slug: (businessResult as { slug?: string } | null)?.slug ?? null,
      must_change_password: true,
    },
  });

  await serviceClient
    .from("business_memberships")
    .update({ must_change_password: true })
    .eq("business_id", businessId)
    .eq("user_id", ownerUserId)
    .eq("role", "business_owner");

  return json({
    business_id: businessId,
    slug: (businessResult as { slug?: string } | null)?.slug,
    owner: {
      user_id: ownerUserId,
      name: ownerName,
      email: ownerEmail,
      phone: ownerPhone || null,
      must_change_password: true,
      temporary_password: temporaryPassword,
    },
  });
});
