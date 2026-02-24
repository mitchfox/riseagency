
-- Create sportscode action types table for AI recognition definitions
CREATE TABLE public.sportscode_action_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_name TEXT NOT NULL,
  description TEXT,
  visual_cues TEXT,
  typical_duration_seconds INTEGER DEFAULT 10,
  category TEXT DEFAULT 'general',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sportscode_action_types ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can read sportscode action types"
ON public.sportscode_action_types FOR SELECT
TO authenticated
USING (true);

-- Staff can manage (using has_role)
CREATE POLICY "Staff can insert sportscode action types"
ON public.sportscode_action_types FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update sportscode action types"
ON public.sportscode_action_types FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can delete sportscode action types"
ON public.sportscode_action_types FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Trigger for updated_at
CREATE TRIGGER update_sportscode_action_types_updated_at
BEFORE UPDATE ON public.sportscode_action_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with default action types and visual cues
INSERT INTO public.sportscode_action_types (action_name, description, visual_cues, typical_duration_seconds, category, display_order) VALUES
('Pass', 'Player distributes the ball to a teammate using feet', 'Ball leaves the player''s feet towards a teammate. Watch for the kicking motion and the ball trajectory changing direction. Short passes show a quick tap, long passes show a fuller swing.', 6, 'On Ball', 1),
('Receive', 'Player controls an incoming ball', 'Ball arriving at the player''s feet, chest, or thigh. The player''s body adjusts to cushion or redirect the ball. First touch moment.', 5, 'On Ball', 2),
('Dribble', 'Player carries the ball past an opponent', 'Player running with ball at feet while an opponent is nearby and being bypassed. Look for close ball control, changes of direction, and a defender being left behind.', 8, 'On Ball', 3),
('Shot', 'Player strikes the ball towards goal', 'Strong kicking motion aimed at the goal. Usually from within 30 yards. The body leans back slightly and the follow-through is pronounced.', 6, 'On Ball', 4),
('Cross', 'Player delivers the ball from a wide area into the box', 'Player on the wing or wide area swinging the ball into the penalty area. The ball travels laterally across the pitch into a dangerous area.', 6, 'On Ball', 5),
('Header', 'Player contacts the ball with their head', 'Player jumps or positions head to meet an aerial ball. Distinctive upward body movement and head contact.', 5, 'On Ball', 6),
('Set Piece', 'Delivery from a dead ball situation', 'Player standing over a stationary ball (corner flag area, free kick position, or sideline for throw-in). Other players positioning themselves before delivery.', 8, 'On Ball', 7),
('Tackle', 'Player attempts to win the ball from an opponent', 'Sliding or standing challenge where the player extends a leg towards the ball while an opponent has possession. Physical contact likely.', 6, 'Defensive', 8),
('Interception', 'Player reads and cuts out an opponent''s pass', 'Player moves into the passing lane and collects or deflects a ball intended for an opponent. Anticipatory movement is key.', 5, 'Defensive', 9),
('Block', 'Player gets their body in the way of a shot or cross', 'Player spreads body or extends limbs to prevent the ball passing. Usually a reaction to a shot or cross at close range.', 4, 'Defensive', 10),
('Clearance', 'Player kicks or heads the ball away from danger', 'Forceful contact to send the ball away from the defensive area. Usually under pressure with no specific target, just distance.', 4, 'Defensive', 11),
('Aerial Duel', 'Player competes for a high ball against an opponent', 'Two players jumping to contest the same ball. Both bodies elevated, arms may be used for balance. Outcome is one player winning the header.', 6, 'Defensive', 12),
('Press', 'Player closes down the ball carrier aggressively', 'Player sprinting or moving quickly towards the opponent who has the ball. Aggressive body shape angled to force a direction. High intensity closing down.', 6, 'Off Ball', 13),
('Run', 'Player makes a penetrating off-the-ball run', 'Player without the ball sprinting into space behind the defensive line or into a channel. Obvious acceleration and forward movement away from marking.', 8, 'Off Ball', 14),
('Drop Deep', 'Player moves towards their own goal to receive', 'Player moving away from the opposition goal into deeper areas, often turning to face the ball. Creating space between themselves and the defensive line.', 6, 'Off Ball', 15);
