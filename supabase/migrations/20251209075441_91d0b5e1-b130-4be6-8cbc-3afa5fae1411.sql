-- Create coaching chat sessions table
CREATE TABLE public.coaching_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Chat',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coaching_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Staff can manage their own chat sessions
CREATE POLICY "Staff can manage coaching_chat_sessions"
ON public.coaching_chat_sessions
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_coaching_chat_sessions_updated_at
BEFORE UPDATE ON public.coaching_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();