import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Determine season from month
function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

// Create profile key from user preferences
function createProfileKey(pace: string, interests: string[]): string {
  return `${pace}_${interests.sort().join("_")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, placeName, placeType, pace, interests, date, websiteUrl } = await req.json();
    
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!openAIKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine season
    const visitDate = new Date(date);
    const season = getSeason(visitDate.getMonth());
    const profileKey = createProfileKey(pace || "moderate", interests || []);

    console.log(`Estimating duration for ${placeName} (${placeType}, ${season}, ${pace})`);

    // Check cache first
    const { data: cached } = await supabase
      .from("cache_duration_estimates")
      .select("*")
      .eq("place_id", placeId)
      .eq("profile_key", profileKey)
      .eq("season", season)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log("Using cached duration estimate");
      return new Response(
        JSON.stringify({
          duration_min: cached.duration_min,
          confidence: cached.confidence,
          assumptions: cached.assumptions,
          risks: cached.risks,
          source: "cache"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use GPT to estimate duration
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: [
          {
            role: "system",
            content: `You are a duration estimation expert for tourist activities.

Estimate how long visitors typically spend at a location based on:
- Place type (museum, park, restaurant, attraction, etc.)
- User pace: ${pace || "moderate"} (relaxed = +30%, moderate = baseline, active = -20%)
- Season: ${season} (affects crowds and weather)
- User interests: ${interests?.join(", ") || "general tourism"}
${websiteUrl ? `- Official website: ${websiteUrl}` : ""}

Consider:
- Queue/entry time
- Core experience time
- Optional extensions (gift shop, cafe, extra exhibits)
- Typical visitor patterns

Return ONLY valid JSON:
{
  "duration_min": [min_minutes, max_minutes],
  "confidence": 0.XX (0-1 scale),
  "assumptions": ["key assumption 1", "key assumption 2"],
  "risks": ["potential delay 1", "potential delay 2"],
  "evidence_snippets": ["fact from website or knowledge"],
  "reasoning": "brief explanation"
}`
          },
          {
            role: "user",
            content: `Estimate duration for: ${placeName} (${placeType || "tourist attraction"})`
          }
        ],
        max_completion_tokens: 500
      }),
    });

    const data = await response.json();
    const estimate = JSON.parse(data.choices[0].message.content);

    console.log("Duration estimate:", estimate);

    // Cache the estimate
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days TTL

    await supabase.from("cache_duration_estimates").insert({
      place_id: placeId,
      profile_key: profileKey,
      season: season,
      duration_min: estimate.duration_min,
      confidence: estimate.confidence,
      assumptions: estimate.assumptions,
      risks: estimate.risks,
      expires_at: expiresAt.toISOString()
    });

    return new Response(
      JSON.stringify({
        duration_min: estimate.duration_min,
        confidence: estimate.confidence,
        assumptions: estimate.assumptions,
        risks: estimate.risks,
        evidence_snippets: estimate.evidence_snippets,
        reasoning: estimate.reasoning,
        source: "gpt"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error estimating duration:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
