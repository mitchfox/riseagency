import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { video_url, player_name } = await req.json();

    if (!video_url || !player_name) {
      return new Response(
        JSON.stringify({ error: "video_url and player_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the audio from the video URL
    console.log("Downloading video for transcription:", video_url.substring(0, 100));
    const videoResponse = await fetch(video_url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    console.log(`Video downloaded: ${(videoBlob.size / 1024 / 1024).toFixed(1)}MB`);

    // Send to ElevenLabs STT API
    const formData = new FormData();
    formData.append("file", videoBlob, "video.mp4");
    formData.append("model_id", "scribe_v2");
    formData.append("tag_audio_events", "false");
    formData.append("diarize", "false");
    formData.append("language_code", "eng");

    console.log("Sending to ElevenLabs STT...");
    const sttResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!sttResponse.ok) {
      const errText = await sttResponse.text();
      console.error("ElevenLabs STT error:", errText);
      throw new Error(`ElevenLabs STT failed: ${sttResponse.status}`);
    }

    const transcription = await sttResponse.json();
    console.log(`Transcription complete: ${transcription.words?.length || 0} words`);

    if (!transcription.words || transcription.words.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], transcript: transcription.text || "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build search terms from player name
    const nameParts = player_name.trim().toLowerCase().split(/\s+/);
    const surname = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];
    const fullName = nameParts.join(" ");

    // Scan words for player name mentions
    const suggestions: Array<{
      start: number;
      end: number;
      timestamp: number;
      context: string;
      word: string;
    }> = [];

    const words = transcription.words as Array<{
      text: string;
      start: number;
      end: number;
    }>;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordLower = word.text.toLowerCase().replace(/[^a-z]/g, "");

      let matched = false;

      // Check surname match (most common in commentary)
      if (wordLower === surname || (surname.length >= 4 && wordLower.includes(surname))) {
        matched = true;
      }

      // Check full name (two consecutive words)
      if (!matched && nameParts.length >= 2 && i < words.length - 1) {
        const nextWordLower = words[i + 1].text.toLowerCase().replace(/[^a-z]/g, "");
        if (wordLower === firstName && nextWordLower === surname) {
          matched = true;
        }
      }

      if (matched) {
        const timestamp = word.start;
        const clipStart = Math.max(0, timestamp - 5);
        const clipEnd = timestamp + 5;

        // Avoid overlapping with previous suggestion
        if (suggestions.length > 0) {
          const prev = suggestions[suggestions.length - 1];
          if (clipStart < prev.end) {
            // Extend previous clip instead
            prev.end = Math.max(prev.end, clipEnd);
            prev.context += ` ... ${word.text}`;
            continue;
          }
        }

        // Build context string (surrounding words)
        const contextStart = Math.max(0, i - 4);
        const contextEnd = Math.min(words.length, i + 5);
        const context = words
          .slice(contextStart, contextEnd)
          .map((w) => w.text)
          .join(" ");

        suggestions.push({
          start: clipStart,
          end: clipEnd,
          timestamp,
          context,
          word: word.text,
        });
      }
    }

    console.log(`Found ${suggestions.length} player mentions`);

    return new Response(
      JSON.stringify({ suggestions, transcript: transcription.text || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Transcription error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
