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

    if (!record) {
      return new Response(
        JSON.stringify({ error: 'Missing record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get all players to notify (concepts are typically for all players)
    const { data: players } = await supabase
      .from('players')
      .select('id')

    if (!players || players.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No players to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contentTitle = record.title || 'New Analysis Concept'

    // Send notification to all players
    for (const player of players) {
      try {
        await supabase.functions.invoke('send-content-notification', {
          body: {
            playerId: player.id,
            contentType: 'analysis',
            contentTitle,
            contentId: record.id
          }
        })
      } catch (error) {
        console.error(`Error notifying player ${player.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifiedPlayers: players.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-new-concept:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
