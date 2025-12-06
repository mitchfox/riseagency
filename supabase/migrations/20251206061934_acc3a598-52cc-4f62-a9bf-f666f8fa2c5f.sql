-- Create table for WhatsApp quick message templates
CREATE TABLE public.whatsapp_quick_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message_content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_quick_messages ENABLE ROW LEVEL SECURITY;

-- Staff can manage quick messages
CREATE POLICY "Staff can manage whatsapp_quick_messages"
ON public.whatsapp_quick_messages
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_quick_messages_updated_at
BEFORE UPDATE ON public.whatsapp_quick_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();