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
    const { tripId } = await req.json();
    
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!openAIKey || !mapsKey) {
      throw new Error("API keys not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch trip and intent
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*, trip_intents(*)")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      throw new Error("Trip not found");
    }

    const intent = trip.trip_intents[0];
    const destinations = intent.destinations as any[];
    const mainDest = destinations[0];

    console.log("Generating itinerary for:", mainDest.city);

    // Calculate number of days
    const startDate = new Date(intent.start_date);
    const endDate = new Date(intent.end_date);
    const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // STEP 1: Find Activities using Google Places API
    console.log("Finding activities...");
    const activitiesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=tourist+attractions+in+${encodeURIComponent(mainDest.city)}&key=${mapsKey}`
    );
    const activitiesData = await activitiesResponse.json();
    const activities = activitiesData.results?.slice(0, 15) || [];

    // STEP 2: Find Restaurants
    console.log("Finding restaurants...");
    const restaurantsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=best+restaurants+in+${encodeURIComponent(mainDest.city)}&key=${mapsKey}`
    );
    const restaurantsData = await restaurantsResponse.json();
    const restaurants = restaurantsData.results?.slice(0, 10) || [];

    // STEP 3: Find Hotels
    console.log("Finding hotels...");
    const hotelsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=hotels+in+${encodeURIComponent(mainDest.city)}&key=${mapsKey}`
    );
    const hotelsData = await hotelsResponse.json();
    const hotels = hotelsData.results?.slice(0, 5) || [];

    // Get detailed info for hotels and save to DB
    for (const hotel of hotels) {
      const detailsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${hotel.place_id}&fields=name,formatted_address,geometry,rating,user_ratings_total,price_level,formatted_phone_number,website&key=${mapsKey}`
      );
      const detailsData = await detailsResponse.json();
      const details = detailsData.result;

      await supabase.from("trip_hotels").insert({
        trip_id: tripId,
        place_id: hotel.place_id,
        name: details.name,
        formatted_address: details.formatted_address,
        geo: details.geometry?.location,
        rating: details.rating,
        user_ratings_total: details.user_ratings_total,
        price_level: details.price_level,
        phone: details.formatted_phone_number,
        website: details.website,
        is_selected: hotels.indexOf(hotel) === 0 // Select first hotel
      });
    }

    // STEP 4: Use GPT to plan daily itinerary
    console.log("Planning daily itinerary...");
    const planningResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `You are a travel planner. Create a ${numDays}-day itinerary for ${mainDest.city}.
            
Trip details:
- Travelers: ${intent.travelers}
- Budget: ${intent.budget_band}
- Interests: ${intent.interests?.join(", ") || "general tourism"}
- Pace: ${intent.pace || "moderate"}

Available activities: ${activities.map((a: any) => a.name).join(", ")}
Available restaurants: ${restaurants.map((r: any) => r.name).join(", ")}

Create a balanced daily schedule with:
- Morning activity (09:00-12:00)
- Lunch (12:00-14:00)
- Afternoon activity (14:00-17:00)
- Dinner (19:00-21:00)
- Optional evening activity

Return ONLY valid JSON array of days:
[{
  "day_number": 1,
  "date": "YYYY-MM-DD",
  "summary": "Brief day summary",
  "timeline": [{
    "slot": "morning",
    "kind": "activity",
    "place_name": "Activity name from list",
    "place_id": "place_id",
    "estimated_duration_min": [120, 180]
  }, {
    "slot": "afternoon",
    "kind": "meal",
    "meal_type": "lunch",
    "place_name": "Restaurant name",
    "place_id": "place_id",
    "estimated_duration_min": [60, 90]
  }]
}]`
          }
        ],
        max_completion_tokens: 4000
      }),
    });

    const planningData = await planningResponse.json();
    let days;
    
    try {
      days = JSON.parse(planningData.choices[0].message.content);
    } catch (e) {
      console.error("Failed to parse GPT response:", planningData.choices[0].message.content);
      throw new Error("Failed to generate valid itinerary");
    }

    // STEP 5: Save days to database
    console.log("Saving itinerary to database...");
    for (const day of days) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (day.day_number - 1));
      
      const { data: savedDay, error: dayError } = await supabase
        .from("trip_days")
        .insert({
          trip_id: tripId,
          date: currentDate.toISOString().split('T')[0],
          day_number: day.day_number,
          city: mainDest.city,
          tzid: mainDest.tzid || "UTC",
          summary: day.summary
        })
        .select()
        .single();

      if (dayError) {
        console.error("Error saving day:", dayError);
        continue;
      }

      // Save timeline items
      for (let i = 0; i < day.timeline.length; i++) {
        const item = day.timeline[i];
        
        // Find matching place from our fetched data
        let placeId = item.place_id;
        if (!placeId) {
          const allPlaces = [...activities, ...restaurants];
          const match = allPlaces.find(p => p.name === item.place_name);
          placeId = match?.place_id;
        }

        await supabase.from("trip_timeline_items").insert({
          day_id: savedDay.id,
          slot: item.slot,
          kind: item.kind,
          place_id: placeId,
          place_name: item.place_name,
          estimated_duration_min: item.estimated_duration_min,
          duration_source: "gpt_estimate",
          meal_type: item.meal_type,
          order_index: i
        });
      }
    }

    // Calculate logistics for each day
    console.log("Calculating logistics and travel times...");
    for (const savedDay of trip.trip_days || []) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/calculate-logistics`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ tripId, dayId: savedDay.id })
        });
      } catch (error) {
        console.error(`Failed to calculate logistics for day ${savedDay.day_number}:`, error);
      }
    }

    // Update trip status to active
    await supabase
      .from("trips")
      .update({ status: "active" })
      .eq("id", tripId);

    console.log("Itinerary generated successfully!");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating itinerary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
