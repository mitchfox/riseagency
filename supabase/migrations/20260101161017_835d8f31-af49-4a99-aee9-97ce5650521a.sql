-- Create storage bucket for signature contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('signature-contracts', 'signature-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for signature contracts bucket
CREATE POLICY "Authenticated users can upload signature contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signature-contracts');

CREATE POLICY "Anyone can view signature contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'signature-contracts');

CREATE POLICY "Authenticated users can update signature contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signature-contracts');

CREATE POLICY "Authenticated users can delete signature contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signature-contracts');

-- Create signature_contracts table
CREATE TABLE public.signature_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'expired')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signature_fields table for field positions
CREATE TABLE public.signature_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.signature_contracts(id) ON DELETE CASCADE,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'date', 'signature')),
    label TEXT NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    x_position NUMERIC NOT NULL,
    y_position NUMERIC NOT NULL,
    width NUMERIC NOT NULL DEFAULT 200,
    height NUMERIC NOT NULL DEFAULT 40,
    required BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signature_submissions table
CREATE TABLE public.signature_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.signature_contracts(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    field_values JSONB NOT NULL DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signature_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for signature_contracts
CREATE POLICY "Authenticated users can view signature contracts"
ON public.signature_contracts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create signature contracts"
ON public.signature_contracts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update signature contracts"
ON public.signature_contracts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete signature contracts"
ON public.signature_contracts FOR DELETE
TO authenticated
USING (true);

-- Public can view active contracts by share_token (for signing)
CREATE POLICY "Public can view active contracts by token"
ON public.signature_contracts FOR SELECT
TO anon
USING (status = 'active');

-- RLS policies for signature_fields
CREATE POLICY "Authenticated users can manage signature fields"
ON public.signature_fields FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view fields for active contracts"
ON public.signature_fields FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.signature_contracts 
        WHERE id = contract_id AND status = 'active'
    )
);

-- RLS policies for signature_submissions
CREATE POLICY "Authenticated users can view submissions"
ON public.signature_submissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can create submissions for active contracts"
ON public.signature_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.signature_contracts 
        WHERE id = contract_id AND status = 'active'
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_signature_contracts_updated_at
BEFORE UPDATE ON public.signature_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();