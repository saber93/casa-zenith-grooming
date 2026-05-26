-- Migration: 20260525120000_business_scoped_receipt_uniqueness.sql
-- Purpose: Scope visible receipt number uniqueness to each business.

DO $$
DECLARE
  v_constraint record;
  v_index record;
BEGIN
  FOR v_constraint IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.checkout_transactions'::regclass
      AND c.contype = 'u'
      AND array_length(c.conkey, 1) = 1
      AND a.attname = 'receipt_number'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.checkout_transactions DROP CONSTRAINT IF EXISTS %I',
      v_constraint.conname
    );
  END LOOP;

  FOR v_index IN
    SELECT i.relname
    FROM pg_catalog.pg_class t
    JOIN pg_catalog.pg_index ix
      ON ix.indrelid = t.oid
    JOIN pg_catalog.pg_class i
      ON i.oid = ix.indexrelid
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = t.oid
     AND a.attnum = ix.indkey[0]
    LEFT JOIN pg_catalog.pg_constraint c
      ON c.conindid = ix.indexrelid
    WHERE t.oid = 'public.checkout_transactions'::regclass
      AND ix.indisunique IS TRUE
      AND c.oid IS NULL
      AND ix.indnkeyatts = 1
      AND a.attname = 'receipt_number'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', v_index.relname);
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_transactions_unique_business_receipt_number
  ON public.checkout_transactions (business_id, receipt_number)
  WHERE receipt_number IS NOT NULL;
