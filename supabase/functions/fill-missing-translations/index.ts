const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALL_LANGUAGES = ['spanish', 'portuguese', 'french', 'german', 'italian', 'polish', 'czech', 'russian', 'turkish', 'croatian', 'norwegian'] as const;
type LanguageColumn = typeof ALL_LANGUAGES[number];

const isLanguageColumn = (value: string): value is LanguageColumn => (ALL_LANGUAGES as readonly string[]).includes(value);

async function applyManualUpdates(
  updates: Array<{ text_key?: string; translations?: Record<string, unknown> }>,
  SUPABASE_URL: string,
  SUPABASE_SERVICE_ROLE_KEY: string,
) {
  let updated = 0;
  const errors: string[] = [];

  for (const item of updates) {
    const textKey = String(item.text_key || '');
    if (!textKey.startsWith('representation.')) {
      errors.push(`Skipped invalid key: ${textKey}`);
      continue;
    }

    const updateObj: Record<string, string> = {};
    for (const [column, value] of Object.entries(item.translations || {})) {
      if (isLanguageColumn(column) && typeof value === 'string' && value.trim()) {
        updateObj[column] = value.trim();
      }
    }

    if (Object.keys(updateObj).length === 0) continue;

    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/translations?page_name=eq.representation&text_key=eq.${encodeURIComponent(textKey)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ ...updateObj, updated_at: new Date().toISOString() }),
      }
    );

    if (updateRes.ok) {
      updated++;
    } else {
      errors.push(`${textKey}: ${await updateRes.text()}`);
    }
  }

  return { updated, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required backend environment variables');
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (Array.isArray(body?.updates)) {
      const result = await applyManualUpdates(body.updates, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      return new Response(JSON.stringify({ message: 'Manual translation update complete', ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.errors.length ? 207 : 200,
      });
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const condition = ALL_LANGUAGES.map(l => `${l}.is.null,${l}.eq.`).join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/translations?select=id,text_key,english,${ALL_LANGUAGES.join(',')}&or=(${condition})&limit=30`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch translations: ${errText}`);
    }

    const rows = await res.json();
    console.log(`Found ${rows.length} rows with missing translations`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ message: 'All translations are complete', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const BATCH_SIZE = 10;
    let totalUpdated = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const textsToTranslate: string[] = [];
      const missingMap: { rowIndex: number; missingLangs: string[] }[] = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        if (!row.english) continue;
        const missing = ALL_LANGUAGES.filter(l => !row[l] || row[l] === '');
        if (missing.length === 0) continue;
        textsToTranslate.push(row.english);
        missingMap.push({ rowIndex: j, missingLangs: missing as unknown as string[] });
      }

      if (textsToTranslate.length === 0) continue;

      const numberedTexts = textsToTranslate.map((text, idx) => `[${idx}] ${text}`).join('\n');
      const systemPrompt = `You are a professional translator for a football agency website called RISE. Translate the following English texts into all of these languages: Spanish, Portuguese, French, German, Italian, Polish, Czech, Russian, Turkish, Croatian, Norwegian.

Important:
- Keep the same tone and style
- Use appropriate football terminology for each language
- Keep brand names (RISE, R90) unchanged
- Return only valid JSON

Return a JSON array with ${textsToTranslate.length} objects, one per input text. Each object must have keys: spanish, portuguese, french, german, italian, polish, czech, russian, turkish, croatian, norwegian.`;

      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: numberedTexts },
          ],
        }),
      });

      if (!aiRes.ok) {
        console.error(`AI error for batch ${i}: ${aiRes.status}`);
        if (aiRes.status === 429) {
          await new Promise(r => setTimeout(r, 5000));
          i -= BATCH_SIZE;
          continue;
        }
        continue;
      }

      const aiData = await aiRes.json();
      let content = aiData.choices?.[0]?.message?.content || '';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let translations: Record<string, string>[];
      try {
        translations = JSON.parse(content);
        if (!Array.isArray(translations)) {
          const match = content.match(/\[[\s\S]*\]/);
          if (match) translations = JSON.parse(match[0]);
          else throw new Error('Not an array');
        }
      } catch (e) {
        console.error(`Parse error for batch ${i}:`, e);
        continue;
      }

      for (let k = 0; k < missingMap.length; k++) {
        const { rowIndex, missingLangs } = missingMap[k];
        const row = batch[rowIndex];
        const trans = translations[k];
        if (!trans) continue;

        const updateObj: Record<string, string> = {};
        for (const lang of missingLangs) {
          if (trans[lang]) updateObj[lang] = trans[lang];
        }

        if (Object.keys(updateObj).length === 0) continue;

        const updateRes = await fetch(
          `${SUPABASE_URL}/rest/v1/translations?id=eq.${row.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(updateObj),
          }
        );

        if (updateRes.ok) totalUpdated++;
        else console.error(`Failed to update row ${row.id}: ${await updateRes.text()}`);
      }

      if (i + BATCH_SIZE < rows.length) await new Promise(r => setTimeout(r, 1000));
    }

    return new Response(
      JSON.stringify({ message: `Translation complete`, updated: totalUpdated, total: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
