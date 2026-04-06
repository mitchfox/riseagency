
ALTER TABLE public.club_network_contacts
  ADD COLUMN IF NOT EXISTS is_favourite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_network_contacts_favourite ON public.club_network_contacts (is_favourite) WHERE is_favourite = true;
CREATE INDEX IF NOT EXISTS idx_network_contacts_tags ON public.club_network_contacts USING GIN (tags);
