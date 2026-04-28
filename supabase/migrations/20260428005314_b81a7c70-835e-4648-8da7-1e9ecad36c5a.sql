
-- ============================================================
-- Representation page translations: positions, navigation, content
-- ============================================================

-- Position abbreviations with localised equivalents (CAM = Central Attacking Midfielder etc.)
INSERT INTO public.translations (page_name, text_key, english, spanish, portuguese, french, german, italian, polish, czech, russian, turkish, croatian, norwegian) VALUES
('positions','positions.GK','GK','POR','GR','GB','TW','POR','BR','BR','ВР','KL','GK','MV'),
('positions','positions.LB','LB','LI','LE','AG','LV','TS','LO','LO','ЛЗ','SB','LB','VB'),
('positions','positions.RB','RB','LD','LD','AD','RV','TD','PO','PO','ПЗ','SB','RB','HB'),
('positions','positions.LCB','LCB','DCI','ZE','DCG','IVL','DCS','ŚO','SO','ЦЗ','STO','SS','SM'),
('positions','positions.RCB','RCB','DCD','ZD','DCD','IVR','DCD','ŚO','SO','ЦЗ','STO','SS','SM'),
('positions','positions.CDM','CDM','MCD','VOL','MDC','DM','MDC','DPM','DZ','ОП','OOS','DV','DM'),
('positions','positions.CM','CM','MC','MC','MC','ZM','CC','ŚP','SZ','ЦП','OS','SV','SM'),
('positions','positions.CAM','CAM','MCO','MO','MOC','OM','TQT','OPM','OZ','АП','HOS','OV','OM'),
('positions','positions.LW','LW','EI','PE','AG','LF','EXT','LS','LK','ЛВ','SK','LK','VK'),
('positions','positions.RW','RW','ED','PD','AD','RF','EXT','PS','PK','ПВ','SK','DK','HK'),
('positions','positions.CF','CF','DC','CA','BU','ST','CA','NAP','ÚT','ЦФ','GB','NA','SP')
ON CONFLICT (page_name, text_key) DO NOTHING;

-- Updated hero subtitle (replace old key with new copy + add v2 alias used in code)
UPDATE public.translations
SET english = 'Realise Potential With Our Experienced Intermediary & English Premier League Performance Team',
    spanish = NULL, portuguese = NULL, french = NULL, german = NULL, italian = NULL,
    polish = NULL, czech = NULL, russian = NULL, turkish = NULL, croatian = NULL, norwegian = NULL,
    updated_at = now()
WHERE page_name='representation' AND text_key='representation.hero_subtitle';

INSERT INTO public.translations (page_name, text_key, english) VALUES
('representation','representation.hero_subtitle_v2','Realise Potential With Our Experienced Intermediary & English Premier League Performance Team')
ON CONFLICT (page_name, text_key) DO UPDATE SET english = EXCLUDED.english,
  spanish=NULL, portuguese=NULL, french=NULL, german=NULL, italian=NULL,
  polish=NULL, czech=NULL, russian=NULL, turkish=NULL, croatian=NULL, norwegian=NULL,
  updated_at = now();

-- Navigation labels
INSERT INTO public.translations (page_name, text_key, english) VALUES
('representation','representation.back_to_all','Back to all'),
('representation','representation.back_to_performance','Back to Performance'),
('representation','representation.back_to_scouting','Back to Scouting'),
('representation','representation.inside_performance','Inside Performance'),
('representation','representation.tap_for_more','Tap for more'),
('representation','representation.area_intro','Each area below opens on its own screen. Tap to see the detail.'),
('representation','representation.our_live_network','Our live scouting network'),
('representation','representation.see_example_report','See an example performance report (Cristiano Ronaldo vs Real Madrid, 25/01/2012)'),
('representation','representation.see_example_analysis','See an example match analysis (Cristiano Ronaldo vs Getafe)'),
('representation','representation.open_demo_portal','Open a live example portal (Cristiano Ronaldo)')
ON CONFLICT (page_name, text_key) DO NOTHING;

-- Performance subsection: Portal
INSERT INTO public.translations (page_name, text_key, english) VALUES
('representation','representation.perf_portal_title','Portal'),
('representation','representation.perf_portal_blurb','A private hub for analysis, reports and direct support.'),
('representation','representation.perf_portal_d1','A bespoke portal for every represented player with reports, analyses and clipped actions in one place.'),
('representation','representation.perf_portal_d2','Direct messaging with the team and a clear record of work shared throughout the season.'),
('representation','representation.perf_portal_d3','Training programmes, schedules and development notes always available on phone or desktop.'),
('representation','representation.perf_portal_d4','Use the live example portal to see exactly what an active player sees.')
ON CONFLICT (page_name, text_key) DO NOTHING;

-- ============================================================
-- New / updated card content (uses _p1..p4 keyed bullet system)
-- ============================================================

-- FEES (under 18 vs over 18)
INSERT INTO public.translations (page_name, text_key, english) VALUES
('representation','representation.fees_under18_p1','We follow a fair industry-standard 5% commission rate.'),
('representation','representation.fees_under18_p2','For players under 18 we waive this entirely. There are no fees at all until the player turns 18.'),
('representation','representation.fees_under18_p3','We never ask for money upfront. Any future commission is only earned on contracts we actually negotiate for the player.'),
('representation','representation.fees_under18_p4','Everything is explained in plain terms before anything is agreed so the family knows exactly where they stand.'),
('representation','representation.fees_over18_p1','We follow a fair industry-standard 5% commission rate, in line with FIFA and National FA frameworks.'),
('representation','representation.fees_over18_p2','We never ask for money upfront. We only earn commission on the contracts we actually secure for our players.'),
('representation','representation.fees_over18_p3','No hidden charges, no vague extras and nothing renamed later to mean something different.'),
('representation','representation.fees_over18_p4','The financial side is set out clearly before anything is signed so trust is in place from day one.'),

-- AGREEMENT
('representation','representation.agreement_under18_p1','We sign a representation agreement together that typically lasts 2 years, with the parent or guardian alongside the player.'),
('representation','representation.agreement_under18_p2','Each Summer we review the work and renew with a fresh agreement if the player and family are happy.'),
('representation','representation.agreement_under18_p3','The agreement makes clear what we are entrusted to do, what to expect from our work and what falls outside our remit.'),
('representation','representation.agreement_under18_p4','Everything follows FIFA and National FA rules and regulations, written in plain language so nothing feels hidden.'),
('representation','representation.agreement_over18_p1','We sign a representation agreement together that typically lasts 2 years.'),
('representation','representation.agreement_over18_p2','Each Summer we sit down and renew with a fresh agreement if you are happy with the work we have done.'),
('representation','representation.agreement_over18_p3','The agreement sets out what to expect from us, what we are entrusted to do and what we are not, with no grey areas.'),
('representation','representation.agreement_over18_p4','All terms follow FIFA and National FA rules and regulations so the relationship is properly protected on both sides.'),

-- CLUB NETWORK
('representation','representation.network_p1','We work with hundreds of clubs across Europe and many more in Asia, the Middle East and Africa.'),
('representation','representation.network_p2','We position our players in front of clubs throughout the year, not just in transfer windows, so they become familiar faces with their talents well understood.'),
('representation','representation.network_p3','Every introduction is backed by footage, reports and proper context so club conversations start with substance.'),
('representation','representation.network_p4','Long-term relationships with sporting directors and recruitment staff mean our players are remembered when the right opportunity opens.'),

-- BRAND
('representation','representation.brand_p1','We build our players'' presence so the football is supported by a serious, consistent public profile.'),
('representation','representation.brand_p2','A stronger profile opens doors to sponsors, brand partners and off-pitch opportunities that genuinely fit the player.'),
('representation','representation.brand_p3','Clips, reports and public materials are tightened so anyone checking the player sees a professional, current picture.'),
('representation','representation.brand_p4','The aim is clarity and quality, not noise, so the player''s presence works for them on and off the pitch.'),

-- EXPECTATIONS
('representation','representation.expectations_under18_p1','We are not just any agency. Our players cannot be just any player.'),
('representation','representation.expectations_under18_p2','Access to expert analysis, coaching and agent support requires full commitment from the player and family.'),
('representation','representation.expectations_under18_p3','We want players who will give their all to the game, listen properly and act on feedback.'),
('representation','representation.expectations_under18_p4','Will, standards and consistency off the pitch matter as much as moments on the ball.'),
('representation','representation.expectations_over18_p1','Our players show a different level of will. We are not just any agency and you must not be just any player.'),
('representation','representation.expectations_over18_p2','Having access to expert analysis, coaching and agent support requires full commitment, day in and day out.'),
('representation','representation.expectations_over18_p3','You have to be willing to hear honest feedback and act on it without ego getting in the way.'),
('representation','representation.expectations_over18_p4','Standards off the pitch must match the ambition on it. We work with players who give their all to the game.'),

-- PERFORMANCE (top level intro - speak generally about depth + team background)
('representation','representation.performance_p1','We go to a level of detail almost no one else in football management offers, with a team built around English Premier League experience.'),
('representation','representation.performance_p2','Match analysis, R90 action grading, technical breakdowns, physical work, nutrition, technique and psychology all sit under one roof.'),
('representation','representation.performance_p3','Every input is shaped by the player''s real games, not generic templates copied across a roster.'),
('representation','representation.performance_p4','Open Inside Performance below to see exactly what each service looks like in practice.')
ON CONFLICT (page_name, text_key) DO NOTHING;

-- ============================================================
-- Updated FAQs reflecting fees + agreement messaging
-- ============================================================
INSERT INTO public.translations (page_name, text_key, english) VALUES
('representation','representation.faq_u18_q1','Do you charge a fee to represent under-18 players?'),
('representation','representation.faq_u18_a1','No. We waive our standard 5% commission entirely for under-18 players. There are no fees at all until the player turns 18.'),
('representation','representation.faq_u18_q2','Does a parent or guardian have to be involved?'),
('representation','representation.faq_u18_a2','Yes. The parent or guardian is part of every key conversation and signs the representation agreement alongside the player.'),
('representation','representation.faq_u18_q3','How long does the representation agreement last?'),
('representation','representation.faq_u18_a3','Typically 2 years. Each Summer we review the work and only renew with a fresh agreement if the player and family are happy.'),
('representation','representation.faq_u18_q4','What clubs do you work with?'),
('representation','representation.faq_u18_a4','Hundreds of clubs across Europe, plus a strong reach into Asia, the Middle East and Africa. Players are positioned in front of clubs throughout the year.'),
('representation','representation.faq_u18_q5','What footage should we send?'),
('representation','representation.faq_u18_a5','Recent full-match footage is best. Highlights help, but full games show level, decision making and consistency. Add a short note on current club and position.'),
('representation','representation.faq_u18_q6','Will my child train with RISE?'),
('representation','representation.faq_u18_a6','We do not run a training programme. We support development through analysis, coaching input, feedback and well-considered next steps with the existing or a better-fitting club.'),

('representation','representation.faq_o18_q1','What does it actually cost?'),
('representation','representation.faq_o18_a1','We follow a fair industry-standard 5% commission. We never ask for money upfront and we only earn on contracts we actually negotiate for you.'),
('representation','representation.faq_o18_q2','How long does the agreement last and what does it cover?'),
('representation','representation.faq_o18_a2','Typically 2 years, in line with FIFA and National FA rules. Each Summer we renew with a fresh agreement if you are happy with the work. The agreement makes clear what we do, what we are entrusted to do and what we are not.'),
('representation','representation.faq_o18_q3','What clubs are you connected to?'),
('representation','representation.faq_o18_a3','Hundreds of clubs across Europe, plus an active reach into Asia, the Middle East and Africa. Players are introduced throughout the year, not just in windows.'),
('representation','representation.faq_o18_q4','Can I keep my current agent and add RISE?'),
('representation','representation.faq_o18_a4','No. Standard intermediary rules mean we work as the sole representative once an agreement is in place. We will not move forward while another exclusive agreement is active.'),
('representation','representation.faq_o18_q5','What kind of performance support do I get?'),
('representation','representation.faq_o18_a5','Real R90 reports, clipped actions, full match analysis, physical work, technique, nutrition and psychology — backed by a private portal. See the live Cristiano Ronaldo example on the page.'),
('representation','representation.faq_o18_q6','How quickly will I hear back after submitting?'),
('representation','representation.faq_o18_a6','We aim to respond within a few working days. Full assessment takes longer because we want to be properly informed before saying yes or no.')
ON CONFLICT (page_name, text_key) DO NOTHING;
