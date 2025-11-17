-- Migration 000066 DOWN: Revert lead_status changes derived from DNS/HTTP validation
BEGIN;

UPDATE public.generated_domains AS gd
SET lead_status = 'pending'::public.domain_lead_status_enum
WHERE lead_status = 'no_match'::public.domain_lead_status_enum
  AND (
    (gd.dns_status IS NOT NULL AND gd.dns_status NOT IN ('pending','ok')) OR
    (gd.http_status IS NOT NULL AND gd.http_status NOT IN ('pending','ok'))
  );

COMMIT;
