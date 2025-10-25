import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormSubmission {
  formType: string;
  data: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formType, data }: FormSubmission = await req.json();
    
    console.log("Received form submission:", formType);

    let subject = "";
    let htmlContent = "";

    switch (formType) {
      case "work-with-us":
        subject = `New ${data.role} Application - ${data.name}`;
        htmlContent = `
          <h2>New Work With Us Submission</h2>
          <p><strong>Role:</strong> ${data.role}</p>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>WhatsApp:</strong> ${data.whatsapp || "Not provided"}</p>
          ${data.currentClub ? `<p><strong>Current Club:</strong> ${data.currentClub}</p>` : ""}
          ${data.position ? `<p><strong>Position:</strong> ${data.position}</p>` : ""}
          ${data.clubName ? `<p><strong>Club Name:</strong> ${data.clubName}</p>` : ""}
          ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ""}
          ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ""}
          ${data.playerName ? `<p><strong>Player Name:</strong> ${data.playerName}</p>` : ""}
          ${data.organization ? `<p><strong>Organization:</strong> ${data.organization}</p>` : ""}
          ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ""}
        `;
        break;

      case "declare-interest":
        subject = `Interest Declared in ${data.playerName} - ${data.name}`;
        htmlContent = `
          <h2>New Player Interest Declaration</h2>
          <p><strong>Player:</strong> ${data.playerName}</p>
          <p><strong>From:</strong> ${data.name}</p>
          <p><strong>Role:</strong> ${data.role}</p>
          <p><strong>Club/Company:</strong> ${data.clubOrCompany}</p>
          <p><strong>Request:</strong></p>
          <p>${data.request}</p>
        `;
        break;

      case "representation":
        subject = `Representation Request - ${data.name}`;
        htmlContent = `
          <h2>New Representation Request</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Current Club:</strong> ${data.currentClub || "Not provided"}</p>
          <p><strong>Position:</strong> ${data.position || "Not provided"}</p>
          ${data.message ? `<p><strong>Message:</strong></p><p>${data.message}</p>` : ""}
        `;
        break;

      case "request-scout":
        subject = `Scout Request - ${data.team} vs TBD on ${data.matchDate}`;
        htmlContent = `
          <h2>New Scout Attendance Request</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || "Not provided"}</p>
          <p><strong>Team:</strong> ${data.team}</p>
          <p><strong>Match Date:</strong> ${data.matchDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.message ? `<p><strong>Additional Info:</strong></p><p>${data.message}</p>` : ""}
        `;
        break;

      default:
        throw new Error("Invalid form type");
    }

    const emailResponse = await resend.emails.send({
      from: "Rise Football Agency <onboarding@resend.dev>",
      to: ["jolon.levene@risefootballagency.com"],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
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
