UPDATE public.players
SET position = 'CM'
WHERE position IS NULL
   OR position NOT IN ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','CF');