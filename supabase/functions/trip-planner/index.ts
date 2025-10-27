import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: string;
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    
    if (!userId) {
      throw new Error("User ID is required");
    }

    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract intent from conversation
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const conversationHistory = messages.slice(0, -1).map((m: Message) => 
      `${m.role}: ${m.content}`
    ).join("\n");

    // Call GPT-5 to understand intent and extract trip details
    const intentResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `You are a travel planning assistant. Your job is to:
1. Gather trip information through natural conversation
2. Extract: destination(s), dates, number of travelers, budget level, interests, dietary restrictions, accessibility needs, and pace preference
3. Once you have enough information, indicate readiness to create the trip

Required information:
- Destination (city and country)
- Travel dates (start and end)
- Number of travelers
- Budget level (low/medium/high/luxury)

Optional but helpful:
- Interests (beaches, museums, food, adventure, etc.)
- Dietary restrictions
- Accessibility needs
- Pace (relaxed/moderate/active)

Previous conversation:
${conversationHistory}

Respond in JSON format:
{
  "message": "Your conversational response to the user",
  "ready_to_create": true/false,
  "extracted_data": {
    "destinations": [{"city": "", "country": ""}],
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "travelers": number,
    "budget_band": "medium",
    "interests": [],
    "dietary_restrictions": [],
    "accessibility_needs": [],
    "pace": "moderate"
  }
}`
          },
          {
            role: "user",
            content: lastUserMessage
          }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!intentResponse.ok) {
      const errorText = await intentResponse.text();
      console.error("OpenAI API error:", intentResponse.status, errorText);
      throw new Error(`OpenAI API error: ${intentResponse.status}`);
    }

    const intentData = await intentResponse.json();
    const gptResponse = JSON.parse(intentData.choices[0].message.content);

    console.log("GPT Response:", gptResponse);

    // If not ready to create trip, continue conversation
    if (!gptResponse.ready_to_create) {
      return new Response(
        JSON.stringify({ message: gptResponse.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create trip in database
    const runId = crypto.randomUUID();
    const extracted = gptResponse.extracted_data;
    
    // Generate title from destination
    const mainDest = extracted.destinations[0];
    const title = `Trip to ${mainDest.city}`;

    // Create trip
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        user_id: userId,
        run_id: runId,
        title: title,
        status: "draft",
        locale: "en-US"
      })
      .select()
      .single();

    if (tripError) {
      console.error("Trip creation error:", tripError);
      throw tripError;
    }

    // Create intent
    const { error: intentError } = await supabase
      .from("trip_intents")
      .insert({
        trip_id: trip.id,
        destinations: extracted.destinations,
        start_date: extracted.start_date,
        end_date: extracted.end_date,
        travelers: extracted.travelers || 1,
        budget_band: extracted.budget_band || "medium",
        interests: extracted.interests || [],
        dietary_restrictions: extracted.dietary_restrictions || [],
        accessibility_needs: extracted.accessibility_needs || [],
        pace: extracted.pace || "moderate"
      });

    if (intentError) {
      console.error("Intent creation error:", intentError);
      throw intentError;
    }

    console.log("Trip created successfully:", trip.id);

    return new Response(
      JSON.stringify({ 
        message: "Great! I'm creating your itinerary now. This will take a moment...",
        trip_id: trip.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in trip-planner function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
