import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrls, caseStudyId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing messages to determine starting order
    const { data: existingMessages } = await supabase
      .from("case_study_messages")
      .select("message_order")
      .eq("case_study_id", caseStudyId)
      .order("message_order", { ascending: false })
      .limit(1);

    const startOrder = (existingMessages?.[0]?.message_order ?? -1) + 1;

    // Build the prompt with image URLs
    const imageContent = imageUrls.map((url: string) => ({
      type: "image_url",
      image_url: { url },
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are analysing screenshots of messaging conversations (WhatsApp, Instagram DM, email, etc). Extract each individual message from the screenshots and return them as a structured conversation flow.

For each message, determine:
- sender_type: "us" (the agency/person initiating) or "them" (the other party)
- sender_name: the name shown for the sender if visible
- message_text: the exact text of the message
- note: your analysis of why this message was sent, what the strategy was, or what can be read into the response

Return a JSON array of messages in chronological order.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Parse these messaging screenshots into individual messages. Extract the conversation flow, identify who sent each message, and provide strategic notes about each exchange." },
              ...imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_messages",
              description: "Extract parsed messages from conversation screenshots",
              parameters: {
                type: "object",
                properties: {
                  messages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sender_type: { type: "string", enum: ["us", "them"] },
                        sender_name: { type: "string" },
                        message_text: { type: "string" },
                        note: { type: "string" },
                      },
                      required: ["sender_type", "message_text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["messages"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_messages" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("AI gateway error: " + response.status);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const parsedMessages = parsed.messages || [];

    // Insert messages into database
    const inserts = parsedMessages.map((msg: any, idx: number) => ({
      case_study_id: caseStudyId,
      message_order: startOrder + idx,
      sender_type: msg.sender_type || "us",
      sender_name: msg.sender_name || null,
      message_text: msg.message_text || "",
      note: msg.note || null,
      image_url: idx < imageUrls.length ? imageUrls[idx] : null,
    }));

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("case_study_messages")
        .insert(inserts);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ success: true, messageCount: inserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-case-study-images error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
