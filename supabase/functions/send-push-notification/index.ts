import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  player_id: string;
  notification_type: 'performance_reports' | 'analyses' | 'programmes' | 'highlights' | 'clips';
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const payload: NotificationPayload = await req.json()
    console.log('Notification payload:', payload)

    // Check notification preferences
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('player_id', payload.player_id)
      .single()

    if (prefsError && prefsError.code !== 'PGRST116') {
      throw prefsError
    }

    // If no preferences found, assume all enabled
    const notificationsEnabled = preferences 
      ? preferences[payload.notification_type] 
      : true

    if (!notificationsEnabled) {
      console.log('Notifications disabled for this type:', payload.notification_type)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification skipped - user preference disabled' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get push tokens for the player
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_notification_tokens')
      .select('token, device_type')
      .eq('player_id', payload.player_id)

    if (tokensError) {
      throw tokensError
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for player:', payload.player_id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No push tokens to send notification to' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send notifications via FCM/APNS
    // Note: In production, you would integrate with FCM for Android and APNS for iOS
    // This is a placeholder for the actual push notification sending logic
    console.log('Would send push notification to tokens:', tokens)
    console.log('Notification:', {
      title: payload.title,
      body: payload.body,
      data: payload.data
    })

    // For now, we'll just log the notification
    // In production, you would call FCM/APNS APIs here
    const results = tokens.map(token => ({
      token: token.token,
      device_type: token.device_type,
      status: 'simulated_success'
    }))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Push notifications sent',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending push notification:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})