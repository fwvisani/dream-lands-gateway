import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, editRequest } = await req.json();
    
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!openAIKey || !mapsKey) {
      throw new Error("API keys not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current trip
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select(`
        *,
        trip_intents(*),
        trip_days(
          *,
          trip_timeline_items(*)
        )
      `)
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      throw new Error("Trip not found");
    }

    console.log("Processing edit request:", editRequest);

    // Use GPT to understand the edit intent
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
            content: `You are a trip editing assistant. Parse user edit requests and identify:
- What to change (activity, meal, hotel, time)
- Which day (or "all days", "day 2", "tomorrow", etc.)
- What specifically to change to
- Type of edit: swap, remove, add, extend_duration, move_to_different_time

Current trip summary:
${JSON.stringify(trip.trip_days?.map((d: any) => ({
  day: d.day_number,
  date: d.date,
  items: d.trip_timeline_items?.map((i: any) => `${i.slot}: ${i.place_name}`)
})), null, 2)}

User request: "${editRequest}"

Return JSON:
{
  "action": "swap|remove|add|extend_duration|move",
  "target_day": number or null for all,
  "target_slot": "morning|afternoon|evening|night",
  "item_to_change": "current item name",
  "new_item": "replacement or null",
  "search_query": "what to search for in Google Places",
  "reasoning": "brief explanation"
}`
          }
        ],
        max_completion_tokens: 500
      }),
    });

    const intentData = await intentResponse.json();
    const editIntent = JSON.parse(intentData.choices[0].message.content);

    console.log("Edit intent:", editIntent);

    // Execute the edit based on intent
    if (editIntent.action === "swap" && editIntent.search_query) {
      // Search for replacement
      const searchResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(editIntent.search_query)}&key=${mapsKey}`
      );
      const searchData = await searchResponse.json();
      
      if (!searchData.results || searchData.results.length === 0) {
        throw new Error("No alternatives found");
      }

      const replacement = searchData.results[0];

      // Get place details
      const detailsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${replacement.place_id}&fields=name,formatted_address,geometry,rating,opening_hours&key=${mapsKey}`
      );
      const detailsData = await detailsResponse.json();
      const details = detailsData.result;

      // Find and update the timeline item
      for (const day of trip.trip_days || []) {
        if (editIntent.target_day && day.day_number !== editIntent.target_day) continue;
        
        for (const item of day.trip_timeline_items || []) {
          const matches = item.place_name.toLowerCase().includes(editIntent.item_to_change?.toLowerCase()) ||
                         item.slot === editIntent.target_slot;
          
          if (matches) {
            // Update the item
            await supabase
              .from("trip_timeline_items")
              .update({
                place_id: replacement.place_id,
                place_name: details.name,
                place_data: details
              })
              .eq("id", item.id);
            
            console.log(`Updated ${item.place_name} to ${details.name} on day ${day.day_number}`);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `I've replaced ${editIntent.item_to_change} with ${details.name}. ${editIntent.reasoning}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (editIntent.action === "remove") {
      // Remove timeline item
      for (const day of trip.trip_days || []) {
        if (editIntent.target_day && day.day_number !== editIntent.target_day) continue;
        
        for (const item of day.trip_timeline_items || []) {
          const matches = item.place_name.toLowerCase().includes(editIntent.item_to_change?.toLowerCase()) ||
                         item.slot === editIntent.target_slot;
          
          if (matches) {
            await supabase
              .from("trip_timeline_items")
              .delete()
              .eq("id", item.id);
            
            console.log(`Removed ${item.place_name} from day ${day.day_number}`);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `I've removed ${editIntent.item_to_change} from your itinerary.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default response for unhandled actions
    return new Response(
      JSON.stringify({ 
        success: false,
        message: "I understand you want to make changes, but I need more details. Can you be more specific?"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error editing trip:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
