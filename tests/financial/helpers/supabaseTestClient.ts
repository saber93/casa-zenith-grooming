import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResult } from "pg";

const poolerUrl =
  "postgresql://postgres.oogwfqnrgdvngifycdxk@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

export const requireDbPassword = () => {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error("SUPABASE_DB_PASSWORD is required for financial QA tests.");
  }
  return password;
};

export const createRunId = (prefix = "financial-qa") =>
  `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

export const pool = new Pool({
  connectionString: poolerUrl.replace("@", `:${encodeURIComponent(requireDbPassword())}@`),
  ssl: { rejectUnauthorized: false },
  max: 12,
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query(sql, params);
}

export async function withAuth<T>(userId: string, fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await client.query("SELECT set_config('request.jwt.claim.role', 'authenticated', true)");
    await client.query("SELECT set_config('role', 'authenticated', true)");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function expectDbFailure(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
    return { passed: false, message: "unexpected success" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { passed: pattern.test(message), message };
  }
}

export async function closePool() {
  await pool.end();
}
