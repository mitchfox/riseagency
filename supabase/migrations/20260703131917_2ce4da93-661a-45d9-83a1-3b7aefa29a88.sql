UPDATE public.players
SET representation_status = 'Top Agency'
WHERE representation_status IS DISTINCT FROM 'Top Agency'
  AND agent_name IS NOT NULL
  AND (
    regexp_replace(lower(agent_name), '[^a-z0-9]', '', 'g') LIKE '%caabase%'
    OR regexp_replace(lower(agent_name), '[^a-z0-9]', '', 'g') LIKE '%wasserman%'
    OR regexp_replace(lower(agent_name), '[^a-z0-9]', '', 'g') LIKE '%caastellar%'
    OR regexp_replace(lower(agent_name), '[^a-z0-9]', '', 'g') LIKE '%raiolagroup%'
    OR regexp_replace(lower(agent_name), '[^a-z0-9]', '', 'g') LIKE '%gestifute%'
  );