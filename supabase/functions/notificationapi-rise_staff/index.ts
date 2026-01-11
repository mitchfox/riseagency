import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHmac } from 'node:crypto';

const CLIENT_ID = 'loh9vmmeprzaevga91nxoa69jg';
const CLIENT_SECRET = 'va8ylds4ugpddc8wg2ejabdxyburwbmiljz8gm7wg59qtpucalxzr1zt9i';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HMAC-SHA256 hash for authentication
function generateHash(data: string): string {
  return createHmac('sha256', CLIENT_SECRET).update(data).digest('base64');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, email } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Phone number is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Sending SMS to:', phone, 'with message:', message);

    const userId = email || phone;
    const timestamp = Math.floor(Date.now() / 1000);
    const hashedUserId = generateHash(userId);

    const payload = {
      notificationId: 'rise_staff',
      user: {
        id: userId,
        number: phone
      },
      mergeTags: {},
      options: {
        sms: {
          message: message
        }
      }
    };

    // Use Basic auth with clientId:clientSecret
    const authHeader = `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`;

    const response = await fetch('https://api.notificationapi.com/loh9vmmeprzaevga91nxoa69jg/sender/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('NotificationAPI response:', JSON.stringify(result));

    if (!response.ok) {
      console.error('NotificationAPI error:', response.status, result);
      return new Response(JSON.stringify({
        success: false,
        error: result.message || `API error: ${response.status}`
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
