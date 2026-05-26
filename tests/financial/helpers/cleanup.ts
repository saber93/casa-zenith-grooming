import { FinancialTestFactory } from "./testDataFactory";
import { pool } from "./supabaseTestClient";

export async function cleanupFinancialTest(factory: FinancialTestFactory) {
  const like = `%${factory.runId}%`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('casa.checkout_mutation', 'true', true)");
    await client.query(
      `
    WITH tx AS (SELECT id FROM public.checkout_transactions WHERE business_id = $1 OR notes LIKE $2)
    DELETE FROM public.financial_ledger_entries fle USING tx WHERE fle.checkout_transaction_id = tx.id
    `,
      [factory.businessId, like],
    );
    await client.query(
      `
    WITH tx AS (SELECT id FROM public.checkout_transactions WHERE business_id = $1 OR notes LIKE $2)
    DELETE FROM public.product_inventory_movements pim USING tx WHERE pim.checkout_transaction_id = tx.id
    `,
      [factory.businessId, like],
    );
    await client.query(
      `
    WITH tx AS (SELECT id FROM public.checkout_transactions WHERE business_id = $1 OR notes LIKE $2)
    DELETE FROM public.checkout_transaction_items cti USING tx WHERE cti.transaction_id = tx.id
    `,
      [factory.businessId, like],
    );
    await client.query(
      "DELETE FROM public.checkout_transactions WHERE business_id = $1 OR notes LIKE $2",
      [factory.businessId, like],
    );
    await client.query(
      "DELETE FROM public.cashier_sessions WHERE business_id = $1 OR opened_by = $2",
      [factory.businessId, factory.authUserId],
    );
    await client.query("DELETE FROM public.checkout_receipt_counters WHERE business_id = $1", [
      factory.businessId,
    ]);
    await client.query("DELETE FROM public.queue_tickets WHERE business_id = $1 OR notes LIKE $2", [
      factory.businessId,
      like,
    ]);
    await client.query("DELETE FROM public.bookings WHERE business_id = $1 OR notes LIKE $2", [
      factory.businessId,
      like,
    ]);
    await client.query("DELETE FROM public.discounts WHERE business_id = $1 OR code LIKE $2", [
      factory.businessId,
      like,
    ]);
    await client.query(
      "DELETE FROM public.customer_package_benefits WHERE customer_package_id = $1",
      [factory.customerPackageId],
    );
    await client.query("DELETE FROM public.customer_packages WHERE business_id = $1", [
      factory.businessId,
    ]);
    await client.query("DELETE FROM public.packages WHERE business_id = $1", [factory.businessId]);
    await client.query("DELETE FROM public.user_wallets WHERE business_id = $1", [
      factory.businessId,
    ]);
    await client.query("DELETE FROM public.wallets WHERE business_id = $1", [factory.businessId]);
    await client.query("DELETE FROM public.products WHERE business_id = $1", [factory.businessId]);
    await client.query("DELETE FROM public.services WHERE business_id = $1", [factory.businessId]);
    await client.query("DELETE FROM public.customers WHERE business_id = $1", [factory.businessId]);
    await client.query(
      "DELETE FROM public.business_memberships WHERE business_id = $1 OR user_id = $2",
      [factory.businessId, factory.authUserId],
    );
    await client.query("DELETE FROM public.business_modules WHERE business_id = $1", [
      factory.businessId,
    ]);
    await client.query("DELETE FROM public.businesses WHERE id = $1", [factory.businessId]);
    await client.query("DELETE FROM public.user_roles WHERE user_id = $1", [factory.authUserId]);
    await client.query("DELETE FROM auth.identities WHERE user_id = $1", [factory.authUserId]);
    await client.query("DELETE FROM auth.users WHERE id = $1", [factory.authUserId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
