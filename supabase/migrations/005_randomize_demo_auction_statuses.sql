-- ============================================================================
-- Migration 005: Randomize the 60 demo auctions into 20 closed, 20 extended,
-- and 20 live auctions.
-- ============================================================================

WITH randomized_demo_auctions AS (
  SELECT
    a.id,
    row_number() OVER (ORDER BY random()) AS rn
  FROM public.auctions a
  JOIN public.listings l ON l.id = a.listing_id
  WHERE l.title LIKE '[Demo] %'
  LIMIT 60
)
UPDATE public.auctions AS a
SET
  status = CASE
    WHEN r.rn <= 20 THEN 'closed'::public.auction_status
    WHEN r.rn <= 40 THEN 'extended'::public.auction_status
    ELSE 'live'::public.auction_status
  END,
  start_time = CASE
    WHEN r.rn <= 20 THEN NOW() - INTERVAL '2 days'
    ELSE NOW() - INTERVAL '2 hours'
  END,
  end_time = CASE
    WHEN r.rn <= 20 THEN NOW() - INTERVAL '1 hour'
    ELSE NOW() + ((r.rn % 6 + 1) || ' hours')::interval
  END,
  original_end_time = CASE
    WHEN r.rn <= 20 THEN NOW() - INTERVAL '1 hour'
    ELSE NOW() + ((r.rn % 6 + 1) || ' hours')::interval
  END,
  closed_by = CASE
    WHEN r.rn <= 20 THEN '10000000-0000-0000-0000-000000000002'::uuid
    ELSE NULL
  END,
  closure_reason = CASE
    WHEN r.rn <= 20 THEN 'Demo auction closed for completed-order testing'
    ELSE NULL
  END,
  updated_at = NOW()
FROM randomized_demo_auctions AS r
WHERE a.id = r.id;
