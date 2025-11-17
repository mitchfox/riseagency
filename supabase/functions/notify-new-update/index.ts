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

    if (!record || !record.visible_to_player_ids || record.visible_to_player_ids.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No players to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contentTitle = record.title || 'New Update'

    // Send notification to all visible players
    for (const playerId of record.visible_to_player_ids) {
      try {
        await supabase.functions.invoke('send-content-notification', {
          body: {
            playerId,
            contentType: 'update',
            contentTitle,
            contentId: record.id
          }
        })
      } catch (error) {
        console.error(`Error notifying player ${playerId}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifiedPlayers: record.visible_to_player_ids.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-new-update:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
