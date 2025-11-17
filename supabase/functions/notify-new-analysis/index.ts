import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { record } = await req.json()

    if (!record || !record.player_id) {
      return new Response(
        JSON.stringify({ error: 'Missing player_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Format the content title
    const opponent = record.opponent || 'Match'
    const date = new Date(record.analysis_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    const contentTitle = `${opponent} - ${date}`

    // Send notification
    await supabase.functions.invoke('send-content-notification', {
      body: {
        playerId: record.player_id,
        contentType: 'performance_report',
        contentTitle,
        contentId: record.id
      }
    })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-new-analysis:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
