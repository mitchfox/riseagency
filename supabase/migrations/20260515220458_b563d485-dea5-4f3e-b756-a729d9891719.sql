
ALTER TABLE public.signature_contracts
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS document_hash text,
  ADD COLUMN IF NOT EXISTS locked_file_url text,
  ADD COLUMN IF NOT EXISTS locked_fields_snapshot jsonb;

ALTER TABLE public.signature_submissions
  ADD COLUMN IF NOT EXISTS intent_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS document_hash text,
  ADD COLUMN IF NOT EXISTS signed_pdf_url text,
  ADD COLUMN IF NOT EXISTS signed_pdf_hash text;

-- Trigger: lock signature_contracts protected columns once locked_at is set
CREATE OR REPLACE FUNCTION public.enforce_signature_contract_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    IF NEW.file_url IS DISTINCT FROM OLD.file_url
       OR NEW.owner_field_values::text IS DISTINCT FROM OLD.owner_field_values::text
       OR NEW.locked_file_url IS DISTINCT FROM OLD.locked_file_url
       OR NEW.document_hash IS DISTINCT FROM OLD.document_hash
       OR NEW.locked_fields_snapshot::text IS DISTINCT FROM OLD.locked_fields_snapshot::text
       OR NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
      RAISE EXCEPTION 'Contract is locked. Duplicate the contract to make changes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_signature_contract_lock ON public.signature_contracts;
CREATE TRIGGER enforce_signature_contract_lock
BEFORE UPDATE ON public.signature_contracts
FOR EACH ROW EXECUTE FUNCTION public.enforce_signature_contract_lock();

-- Trigger: prevent fields changes on locked contracts
CREATE OR REPLACE FUNCTION public.enforce_signature_fields_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_locked boolean;
  cid uuid;
BEGIN
  cid := COALESCE(NEW.contract_id, OLD.contract_id);
  SELECT (locked_at IS NOT NULL) INTO is_locked
  FROM public.signature_contracts WHERE id = cid;
  IF is_locked THEN
    RAISE EXCEPTION 'Contract is locked. Fields cannot be modified.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_signature_fields_lock ON public.signature_fields;
CREATE TRIGGER enforce_signature_fields_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.signature_fields
FOR EACH ROW EXECUTE FUNCTION public.enforce_signature_fields_lock();
