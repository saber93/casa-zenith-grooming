import { randomUUID } from "node:crypto";
import { Pool, type QueryResult } from "pg";
import { createClient } from "@supabase/supabase-js";

const poolerUrl =
  "postgresql://postgres.oogwfqnrgdvngifycdxk@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

export const requireDbPassword = () => {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("SUPABASE_DB_PASSWORD is required for UAT tests.");
  return password;
};

export const createRunId = (prefix = "uat-demo") =>
  `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

export const pool = new Pool({
  connectionString: poolerUrl.replace("@", `:${encodeURIComponent(requireDbPassword())}@`),
  ssl: { rejectUnauthorized: false },
  max: 8,
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query(sql, params);
}

export const supabaseUrl =
  process.env.VITE_SUPABASE_URL ?? "https://oogwfqnrgdvngifycdxk.supabase.co";
export const supabaseAnonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZ3dmcW5yZ2R2bmdpZnljZHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTAzMjQsImV4cCI6MjA5MTEyNjMyNH0.Wfe1D-pCru2a6p-GDyvKK7ey29i0VSNdoqqZhTrYL8g";

export const createAnonClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export async function closePool() {
  await pool.end();
}
