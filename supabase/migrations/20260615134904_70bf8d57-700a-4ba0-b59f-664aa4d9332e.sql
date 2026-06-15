
CREATE TABLE public.outreach_tools_docs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'doc',
  body text,
  url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_tools_docs TO authenticated;
GRANT ALL ON public.outreach_tools_docs TO service_role;

ALTER TABLE public.outreach_tools_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tools docs"
  ON public.outreach_tools_docs FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tools docs"
  ON public.outreach_tools_docs FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tools docs"
  ON public.outreach_tools_docs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete tools docs"
  ON public.outreach_tools_docs FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER outreach_tools_docs_updated_at
  BEFORE UPDATE ON public.outreach_tools_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.outreach_tools_doc_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id uuid NOT NULL REFERENCES public.outreach_tools_docs(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outreach_tools_doc_items_doc_idx ON public.outreach_tools_doc_items(doc_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_tools_doc_items TO authenticated;
GRANT ALL ON public.outreach_tools_doc_items TO service_role;

ALTER TABLE public.outreach_tools_doc_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tools doc items"
  ON public.outreach_tools_doc_items FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tools doc items"
  ON public.outreach_tools_doc_items FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tools doc items"
  ON public.outreach_tools_doc_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete tools doc items"
  ON public.outreach_tools_doc_items FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER outreach_tools_doc_items_updated_at
  BEFORE UPDATE ON public.outreach_tools_doc_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
