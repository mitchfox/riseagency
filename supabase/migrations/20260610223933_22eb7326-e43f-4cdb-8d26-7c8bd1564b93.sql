-- Allow the player portal (which browses without a logged-in backend session) to read outreach data
CREATE POLICY "Portal can read link players"
  ON public.club_outreach_link_players FOR SELECT TO anon USING (true);

CREATE POLICY "Portal can read outreach communications"
  ON public.club_outreach_communications FOR SELECT TO anon USING (true);

CREATE POLICY "Portal can read legacy club outreach"
  ON public.club_outreach FOR SELECT TO anon USING (true);

CREATE POLICY "Portal can read legacy outreach updates"
  ON public.club_outreach_updates FOR SELECT TO anon USING (true);

CREATE POLICY "Portal can read own club submissions"
  ON public.player_club_submissions FOR SELECT TO anon USING (true);

CREATE POLICY "Portal can add club submissions"
  ON public.player_club_submissions FOR INSERT TO anon WITH CHECK (true);