import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to calculate day centroids and score hotels
async function scoreAndRankHotels(
  supabase: any,
  tripId: string,
  hotels: any[],
  days: any[],
  budgetBand: string,
  mapsKey: string,
  sources: any
) {
  // Calculate centroid for each day based on activities
  const dayCentroids: any = {};
  
  for (const day of days) {
    const { data: items } = await supabase
      .from("trip_timeline_items")
      .select("place_id, place_data")
      .eq("day_id", day.id)
      .eq("kind", "activity");

    if (!items || items.length === 0) continue;

    // Calculate average lat/lng of all activities for this day
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    for (const item of items) {
      // First try to get coords from place_data
      const placeData = item.place_data as any;
      if (placeData?.geo?.lat && placeData?.geo?.lng) {
        sumLat += placeData.geo.lat;
        sumLng += placeData.geo.lng;
        count++;
      } else if (item.place_id) {
        // Fallback: fetch from Google Places if not in place_data
        try {
          sources.maps_calls++;
          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&fields=geometry&key=${mapsKey}`
          );
          const detailsData = await detailsResponse.json();
          const geo = detailsData.result?.geometry?.location;
          if (geo?.lat && geo?.lng) {
            sumLat += geo.lat;
            sumLng += geo.lng;
            count++;
          }
        } catch (error) {
          console.error(`Failed to get location for ${item.place_id}:`, error);
        }
      }
    }

    if (count > 0) {
      dayCentroids[`day${day.day_number}`] = {
        lat: sumLat / count,
        lng: sumLng / count
      };
    }
  }

  // Calculate distance from each hotel to each day's centroid
  for (const hotel of hotels) {
    if (!hotel.geo?.lat || !hotel.geo?.lng) continue;

    const distanceToCentroid: any = {};
    
    for (const [dayKey, centroid] of Object.entries(dayCentroids)) {
      sources.matrix_calls++;
      try {
        const matrixResponse = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${hotel.geo.lat},${hotel.geo.lng}&destinations=${(centroid as any).lat},${(centroid as any).lng}&mode=driving&key=${mapsKey}`
        );
        const matrixData = await matrixResponse.json();
        
        if (matrixData.rows?.[0]?.elements?.[0]?.duration?.value) {
          distanceToCentroid[dayKey] = Math.round(matrixData.rows[0].elements[0].duration.value / 60);
        }
      } catch (error) {
        console.error(`Failed to calculate distance for hotel ${hotel.name}:`, error);
      }
    }

    // Calculate composite score
    // Score factors:
    // 1. Average distance to centroids (lower is better) - weight: 0.4
    // 2. Price alignment with budget - weight: 0.3
    // 3. Rating - weight: 0.3

    const distances = Object.values(distanceToCentroid) as number[];
    const avgDistance = distances.length > 0
      ? distances.reduce((a, b) => a + b, 0) / distances.length
      : 30; // default 30 min if no distance calculated

    // Normalize distance score (0-1, where 1 is best)
    const distanceScore = Math.max(0, 1 - (avgDistance / 60)); // 60 min = 0 score

    // Price alignment score
    const budgetToPriceMap: any = {
      low: 1,
      medium: 2,
      high: 3,
      luxury: 4
    };
    const targetPrice = budgetToPriceMap[budgetBand] || 2;
    const hotelPrice = hotel.price_level || 2;
    const priceScore = Math.max(0, 1 - Math.abs(targetPrice - hotelPrice) / 3);

    // Rating score (normalized 0-1)
    const ratingScore = (hotel.rating || 3) / 5;

    // Composite score
    const score = (distanceScore * 0.4) + (priceScore * 0.3) + (ratingScore * 0.3);

    // Generate reasoning
    const reasons = [];
    if (avgDistance < 15) reasons.push("Very close to planned activities");
    else if (avgDistance < 25) reasons.push("Good proximity to activities");
    
    if (Math.abs(targetPrice - hotelPrice) === 0) reasons.push("Perfect match for your budget");
    else if (Math.abs(targetPrice - hotelPrice) === 1) reasons.push("Within budget range");
    
    if (hotel.rating >= 4.5) reasons.push("Excellent guest ratings");
    else if (hotel.rating >= 4.0) reasons.push("Great guest reviews");

    const reason = reasons.length > 0 ? reasons.join("; ") : "Good option for your trip";

    // Update hotel with score and distances
    await supabase
      .from("trip_hotels")
      .update({
        score,
        reason,
        distance_to_day_centroid: distanceToCentroid
      })
      .eq("id", hotel.id);

    hotel.score = score; // Update local copy for ranking
  }

  // Select the best hotel (highest score)
  const rankedHotels = hotels.sort((a, b) => (b.score || 0) - (a.score || 0));
  if (rankedHotels.length > 0 && rankedHotels[0].id) {
    await supabase
      .from("trip_hotels")
      .update({ is_selected: true })
      .eq("id", rankedHotels[0].id);
    
    console.log(`Selected best hotel: ${rankedHotels[0].name} with score ${rankedHotels[0].score}`);
  }
}

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

    // Initialize source tracking
    const sources = { maps_calls: 0, gpt_calls: 0, matrix_calls: 0 };
    const debug = { cache_hits: 0, version: 1 };

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
    sources.maps_calls++;
    const activitiesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=tourist+attractions+in+${encodeURIComponent(mainDest.city)}&key=${mapsKey}`
    );
    const activitiesData = await activitiesResponse.json();
    const activities = activitiesData.results?.slice(0, 15) || [];

    // STEP 2: Find Restaurants
    console.log("Finding restaurants...");
    sources.maps_calls++;
    const restaurantsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=best+restaurants+in+${encodeURIComponent(mainDest.city)}&key=${mapsKey}`
    );
    const restaurantsData = await restaurantsResponse.json();
    const restaurants = restaurantsData.results?.slice(0, 10) || [];

    // STEP 3: Find Hotels
    console.log("Finding hotels...");
    sources.maps_calls++;
    const hotelsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=hotels+in+${encodeURIComponent(mainDest.city)}&key=${mapsKey}`
    );
    const hotelsData = await hotelsResponse.json();
    const hotels = hotelsData.results?.slice(0, 5) || [];

    // Get detailed info for hotels and save to DB (initially without scoring)
    const hotelDetails = [];
    for (const hotel of hotels) {
      sources.maps_calls++;
      const detailsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${hotel.place_id}&fields=name,formatted_address,geometry,rating,user_ratings_total,price_level,formatted_phone_number,website,photos&key=${mapsKey}`
      );
      const detailsData = await detailsResponse.json();
      const details = detailsData.result;

      // Extract photo URLs
      const photos = details.photos?.slice(0, 3).map((photo: any) => ({
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${mapsKey}`,
        attributions: photo.html_attributions?.[0] || "Google"
      })) || [];

      const { data: savedHotel } = await supabase.from("trip_hotels").insert({
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
        photos,
        is_selected: false // Will be set after scoring
      }).select().single();

      hotelDetails.push({
        ...savedHotel,
        geo: details.geometry?.location
      });
    }

    // STEP 4: Use GPT to plan daily itinerary with duration estimation
    console.log("Planning daily itinerary with duration estimates...");
    
    // Get duration estimates for activities
    const activityDurations: any = {};
    for (const activity of activities.slice(0, 10)) {
      try {
        sources.gpt_calls++;
        const durationResponse = await fetch(`${supabaseUrl}/functions/v1/estimate-duration`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            placeId: activity.place_id,
            placeName: activity.name,
            placeType: activity.types?.[0] || "tourist_attraction",
            pace: intent.pace || "moderate",
            interests: intent.interests || [],
            date: intent.start_date,
            websiteUrl: null
          })
        });
        const durationData = await durationResponse.json();
        activityDurations[activity.name] = durationData.duration_min;
        if (durationData.source === "cache") {
          debug.cache_hits++;
        }
      } catch (error) {
        console.error(`Failed to estimate duration for ${activity.name}:`, error);
        // Use default estimates
        activityDurations[activity.name] = [120, 180];
      }
    }

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

Available activities (with estimated durations): 
${activities.map((a: any) => `${a.name} (${activityDurations[a.name]?.[0] || 120}-${activityDurations[a.name]?.[1] || 180} min)`).join(", ")}
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

      // Save timeline items and alternatives
      for (let i = 0; i < day.timeline.length; i++) {
        const item = day.timeline[i];
        
        // Find matching place from our fetched data
        let placeId = item.place_id;
        let placeData: any = null;
        let allAlternatives: any[] = [];
        
        if (!placeId) {
          const allPlaces = [...activities, ...restaurants];
          const match = allPlaces.find(p => p.name === item.place_name);
          placeId = match?.place_id;
          placeData = match ? {
            rating: match.rating,
            user_ratings_total: match.user_ratings_total,
            formatted_address: match.formatted_address,
            geo: match.geometry?.location
          } : null;
          
          // Get alternatives for activities
          if (item.kind === "activity") {
            allAlternatives = activities
              .filter((a: any) => a.place_id !== placeId)
              .slice(0, 3);
          } else if (item.kind === "meal") {
            allAlternatives = restaurants
              .filter((r: any) => r.place_id !== placeId)
              .slice(0, 3);
          }
        }

        const { data: savedItem } = await supabase.from("trip_timeline_items").insert({
          day_id: savedDay.id,
          slot: item.slot,
          kind: item.kind,
          place_id: placeId,
          place_name: item.place_name,
          place_data: placeData,
          estimated_duration_min: item.estimated_duration_min,
          duration_source: "gpt_estimate",
          meal_type: item.meal_type,
          order_index: i
        })
        .select()
        .single();

        // Save alternatives
        if (savedItem && allAlternatives.length > 0) {
          for (let j = 0; j < allAlternatives.length; j++) {
            const alt = allAlternatives[j];
            await supabase.from("trip_alternatives").insert({
              timeline_item_id: savedItem.id,
              place_id: alt.place_id,
              place_name: alt.name,
              order_index: j,
              place_data: {
                rating: alt.rating,
                user_ratings_total: alt.user_ratings_total,
                formatted_address: alt.formatted_address
              }
            });
          }
        }
      }
    }

    // Calculate logistics for each day
    console.log("Calculating logistics and travel times...");
    const { data: savedDays } = await supabase
      .from("trip_days")
      .select("*")
      .eq("trip_id", tripId);
      
    for (const savedDay of savedDays || []) {
      try {
        sources.matrix_calls++;
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

    // STEP 6: Score and rank hotels
    console.log("Scoring hotels based on proximity to activities...");
    if (hotelDetails.length > 0 && savedDays && savedDays.length > 0) {
      await scoreAndRankHotels(supabase, tripId, hotelDetails, savedDays, intent.budget_band, mapsKey, sources);
    }

    // Validate itinerary
    console.log("Validating itinerary...");
    let notices: string[] = [];
    try {
      const validationResponse = await fetch(`${supabaseUrl}/functions/v1/validate-itinerary`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tripId })
      });
      const validation = await validationResponse.json();
      notices = validation.notices || [];
    } catch (error) {
      console.error("Validation failed:", error);
    }

    // Enhance presentation with micro-copy
    console.log("Enhancing presentation...");
    try {
      const presenterResponse = await fetch(`${supabaseUrl}/functions/v1/present-itinerary`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tripId })
      });
      await presenterResponse.json();
      console.log("Presentation enhanced");
    } catch (error) {
      console.error("Presenter failed:", error);
    }

    // Update trip status to active with sources and notices
    await supabase
      .from("trips")
      .update({ 
        status: "active",
        sources,
        debug,
        notices
      })
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
