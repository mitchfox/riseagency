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

    const { playerId, contentType, contentTitle, contentId } = await req.json()

    if (!playerId || !contentType || !contentTitle) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get player's notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('player_id', playerId)
      .single()

    // Check if notifications are enabled for this content type
    const contentTypeMap: { [key: string]: keyof typeof preferences } = {
      'analysis': 'analyses',
      'performance_report': 'performance_reports',
      'program': 'programmes',
      'clip': 'clips',
      'highlight': 'highlights'
    }

    const prefKey = contentTypeMap[contentType]
    if (preferences && prefKey && !preferences[prefKey]) {
      return new Response(
        JSON.stringify({ message: 'Notifications disabled for this content type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get push tokens for the player
    const { data: tokens } = await supabase
      .from('push_notification_tokens')
      .select('token, device_type')
      .eq('player_id', playerId)

    // Get web push subscriptions
    const { data: webSubscriptions } = await supabase
      .from('web_push_subscriptions')
      .select('subscription')
      .eq('player_id', playerId)

    const contentTypeLabels: { [key: string]: string } = {
      'analysis': 'New Analysis',
      'performance_report': 'New Performance Report',
      'program': 'New Training Program',
      'clip': 'New Video Clip',
      'highlight': 'New Highlight',
      'update': 'New Update'
    }

    const title = contentTypeLabels[contentType] || 'New Content'
    const body = contentTitle

    let sentCount = 0

    // Send mobile push notifications
    if (tokens && tokens.length > 0) {
      for (const token of tokens) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              token: token.token,
              title,
              body,
              data: { contentType, contentId }
            }
          })
          sentCount++
        } catch (error) {
          console.error('Error sending mobile push:', error)
        }
      }
    }

    // Send web push notifications
    if (webSubscriptions && webSubscriptions.length > 0) {
      for (const sub of webSubscriptions) {
        try {
          await supabase.functions.invoke('send-web-push', {
            body: {
              subscription: sub.subscription,
              title,
              body,
              data: { contentType, contentId }
            }
          })
          sentCount++
        } catch (error) {
          console.error('Error sending web push:', error)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} notifications`,
        playerId,
        contentType,
        contentTitle
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-content-notification:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
