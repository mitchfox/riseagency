import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { Resend } from "https://esm.sh/resend@4.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormSubmission {
  formType: string;
  data: Record<string, any>;
}

interface EmailRequest {
  to: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Check if this is an email sending request
    if (body.to && body.subject && body.message) {
      const { to, subject, message }: EmailRequest = body;
      
      console.log("Sending email to:", to);

      const emailResponse = await resend.emails.send({
        from: "RISE Football <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 20px; text-align: center;">
              <h1 style="color: #B8A574; margin: 0; font-size: 28px; letter-spacing: 2px;">RISE FOOTBALL</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">Realising Potential</p>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              ${message.split('\n').map(line => `<p style="color: #333333; line-height: 1.6; margin: 10px 0;">${line || '<br>'}</p>`).join('')}
            </div>
            <div style="background: #f5f5f5; padding: 20px; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} RISE Football. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
    
    // Otherwise, handle form submission
    const { formType, data }: FormSubmission = body;
    
    console.log("Received form submission:", formType);

    // Save form submission to database
    const { error: dbError } = await supabase
      .from('form_submissions')
      .insert({
        form_type: formType,
        data: data,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    console.log("Form submission saved successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-form-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
