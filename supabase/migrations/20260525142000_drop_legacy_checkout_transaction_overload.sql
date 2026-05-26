-- QA.1: remove obsolete checkout_transaction overload so PostgREST can resolve browser RPC calls unambiguously.

DROP FUNCTION IF EXISTS public.checkout_transaction(
  text,
  uuid,
  uuid,
  uuid,
  jsonb,
  jsonb,
  numeric,
  numeric,
  jsonb,
  numeric,
  numeric,
  numeric,
  jsonb,
  text,
  uuid
);
