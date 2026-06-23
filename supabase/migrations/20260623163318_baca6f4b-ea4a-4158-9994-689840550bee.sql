INSERT INTO public.translations (page_name, text_key, english, spanish, portuguese, czech, russian, french, german, italian, polish, turkish, croatian, norwegian)
SELECT 'representation', text_key, english, spanish, portuguese, czech, russian, french, german, italian, polish, turkish, croatian, norwegian FROM jsonb_to_recordset($json$
[]
$json$::jsonb) AS x(text_key text, english text, spanish text, portuguese text, czech text, russian text, french text, german text, italian text, polish text, turkish text, croatian text, norwegian text)
WHERE FALSE;