import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CLIENT_ID = 'loh9vmmeprzaevga91nxoa69jg';
const CLIENT_SECRET = 'va8ylds4ugpddc8wg2ejabdxyburwbmiljz8gm7wg59qtpucalxzr1zt9i';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const payload = {
      notificationId: 'rise_staff',
      user: {
        id: email || phone,
        number: formattedPhone
      },
      mergeTags: {},
      options: {
        sms: {
          message: message
        }
      }
    };

    // Use Basic Auth - NotificationAPI uses clientId:clientSecret base64 encoded
    const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    
    console.log('Making request to NotificationAPI with Basic Auth...');

    const response = await fetch(`https://api.notificationapi.com/${CLIENT_ID}/sender/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('NotificationAPI response status:', response.status);
    console.log('NotificationAPI response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!response.ok) {
      console.error('NotificationAPI error:', response.status, result);
      return new Response(JSON.stringify({
        success: false,
        error: result.message || `API error: ${response.status}`,
        details: result
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
