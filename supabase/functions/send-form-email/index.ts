import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { Resend } from "https://esm.sh/resend@4.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const NOTIFICATION_EMAIL = "jolon.levene@risefootballagency.com";

// Allowed email addresses for sending/receiving emails
const ALLOWED_STAFF_EMAILS = [
  "jolon.levene@risefootballagency.com",
  "kuda.butawo@risefootballagency.com"
];

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

const getFormTypeLabel = (formType: string): string => {
  const labels: Record<string, string> = {
    'representation': 'Representation Request',
    'interest': 'Interest Declaration',
    'contact': 'Contact Form',
    'scout-application': 'Scout Application',
    'affiliate': 'Affiliate Enquiry',
    'business': 'Business Partnership',
    'media': 'Media Enquiry',
  };
  return labels[formType] || formType;
};

const formatFormData = (data: Record<string, any>): string => {
  return Object.entries(data)
    .map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">${formattedKey}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${value || 'N/A'}</td>
      </tr>`;
    })
    .join('');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Check if this is an email sending request
    if (body.to && body.subject && body.message) {
      const { to, subject, message }: EmailRequest = body;
      
      // Validate recipient email is in allowed list
      const recipientEmail = to.toLowerCase().trim();
      if (!ALLOWED_STAFF_EMAILS.some(allowed => allowed.toLowerCase() === recipientEmail)) {
        console.error("Attempted to send email to unauthorized recipient:", to);
        return new Response(
          JSON.stringify({ 
            error: "Email can only be sent to authorized Rise Football staff addresses" 
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
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

    // Send notification email to admin
    try {
      const formLabel = getFormTypeLabel(formType);
      const submitterName = data.name || data.fullName || data.player_name || 'Unknown';
      const submitterEmail = data.email || 'Not provided';
      
      const notificationResponse = await resend.emails.send({
        from: "RISE Football <onboarding@resend.dev>",
        to: [NOTIFICATION_EMAIL],
        subject: `New ${formLabel} Submission`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 20px; text-align: center;">
              <h1 style="color: #B8A574; margin: 0; font-size: 28px; letter-spacing: 2px;">RISE FOOTBALL</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">New Form Submission</p>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 2px solid #B8A574; padding-bottom: 10px;">
                ${formLabel}
              </h2>
              <p style="color: #666; margin-bottom: 20px;">
                Submitted on ${new Date().toLocaleString('en-GB', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}
              </p>
              <table style="width: 100%; border-collapse: collapse;">
                ${formatFormData(data)}
              </table>
            </div>
            <div style="background: #f5f5f5; padding: 20px; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} RISE Football. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      console.log("Notification email sent successfully:", notificationResponse);
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the request if notification email fails
    }

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
      JSON.stringify({ error: "Failed to process form submission" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
