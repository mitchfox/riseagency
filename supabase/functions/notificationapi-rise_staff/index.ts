import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CLIENT_ID = 'loh9vmmeprzaevga91nxoa69jg';
const CLIENT_SECRET = 'va8ylds4ugpddc8wg2ejabdxyburwbmiljz8gm7wg59qtpucalxzr1zt9i';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reliable Base64 encoding for Deno
function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, email, type = 'sms', subject } = await req.json();

    // Validate based on type
    if (type === 'sms') {
      if (!phone) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Phone number is required for SMS'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (type === 'email') {
      if (!email) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Email address is required for email'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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

    console.log(`Sending ${type} to:`, type === 'sms' ? phone : email, 'with message:', message);

    // Build payload based on type
    let payload: any;
    
    if (type === 'email') {
      // Email notification
      payload = {
        notificationId: 'rise_staff_email',
        user: {
          id: email,
          email: email
        },
        mergeTags: {
          subject: subject || 'Message from RISE Football',
          message: message
        }
      };
    } else {
      // SMS notification (default)
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      payload = {
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
    }

    // Create proper Basic Auth header using reliable encoding
    const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
    const authString = encodeBase64(credentials);
    
    console.log('Auth credentials length:', credentials.length);
    console.log('Base64 result length:', authString.length);
    console.log('Making request to NotificationAPI...');

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
