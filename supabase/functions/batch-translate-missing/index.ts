import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all rows missing translations
    const { data: rows, error } = await supabase
      .from('translations')
      .select('*')
      .or('spanish.is.null,spanish.eq.')
      .not('english', 'is', null)
      .limit(500);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ message: 'No untranslated rows found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${rows.length} rows to translate`);

    // Batch texts for translation (group by ~10 texts per call)
    const batchSize = 10;
    let translated = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const textsMap: Record<string, string> = {};
      batch.forEach(row => {
        textsMap[row.id] = row.english;
      });

      // Ask AI to translate all texts in one call
      const prompt = `Translate each of the following English texts into Spanish, Portuguese, French, German, Italian, Polish, Czech, Russian, Turkish, Croatian, and Norwegian. Return ONLY valid JSON with this exact structure (no markdown):
{
  "<id>": {
    "spanish": "...", "portuguese": "...", "french": "...", "german": "...", "italian": "...", "polish": "...", "czech": "...", "russian": "...", "turkish": "...", "croatian": "...", "norwegian": "..."
  }
}

Here are the texts to translate:
${JSON.stringify(textsMap, null, 2)}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a professional translator for a football agency website. Keep the same tone and style. Preserve proper nouns and brand names. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI error: ${aiResponse.status}`);
        continue;
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || '';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let translations: Record<string, Record<string, string>>;
      try {
        translations = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          translations = JSON.parse(match[0]);
        } else {
          console.error('Failed to parse batch', i);
          continue;
        }
      }

      // Update each row
      for (const row of batch) {
        const t = translations[row.id];
        if (!t) continue;

        const { error: updateError } = await supabase
          .from('translations')
          .update({
            spanish: t.spanish || null,
            portuguese: t.portuguese || null,
            french: t.french || null,
            german: t.german || null,
            italian: t.italian || null,
            polish: t.polish || null,
            czech: t.czech || null,
            russian: t.russian || null,
            turkish: t.turkish || null,
            croatian: t.croatian || null,
            norwegian: t.norwegian || null,
          })
          .eq('id', row.id);

        if (updateError) {
          console.error(`Update failed for ${row.id}:`, updateError);
        } else {
          translated++;
        }
      }

      console.log(`Batch ${Math.floor(i / batchSize) + 1} done, translated ${translated} rows so far`);
    }

    return new Response(
      JSON.stringify({ success: true, translated, total: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Batch translate error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
