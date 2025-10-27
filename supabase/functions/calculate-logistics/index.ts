import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Time bucket helpers
function getTimeBucket(hour: number): string {
  if (hour >= 8 && hour < 12) return "08-12";
  if (hour >= 12 && hour < 16) return "12-16";
  if (hour >= 16 && hour < 20) return "16-20";
  return "20-08";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, dayId } = await req.json();
    
    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!mapsKey) {
      throw new Error("Google Maps API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch day with timeline items
    const { data: day, error: dayError } = await supabase
      .from("trip_days")
      .select("*, trip_timeline_items(*)")
      .eq("id", dayId)
      .single();

    if (dayError || !day) {
      throw new Error("Day not found");
    }

    console.log(`Calculating logistics for day ${day.day_number}`);

    const items = day.trip_timeline_items || [];
    const transfers = [];

    // Calculate distances between consecutive items
    for (let i = 0; i < items.length - 1; i++) {
      const from = items[i];
      const to = items[i + 1];

      if (!from.place_data?.geometry?.location || !to.place_data?.geometry?.location) {
        continue;
      }

      const fromLoc = from.place_data.geometry.location;
      const toLoc = to.place_data.geometry.location;

      // Determine travel mode based on time of day
      const travelMode = "DRIVING"; // Could be smarter based on distance

      // Get time bucket for cache key
      const hour = from.slot === "morning" ? 10 : from.slot === "afternoon" ? 15 : 19;
      const timeBucket = getTimeBucket(hour);

      // Check cache first
      const { data: cachedRoute } = await supabase
        .from("cache_routes")
        .select("*")
        .eq("origin_place_id", from.place_id)
        .eq("destination_place_id", to.place_id)
        .eq("mode", travelMode.toLowerCase())
        .eq("time_bucket", timeBucket)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      let etaMin, polyline;

      if (cachedRoute) {
        console.log(`Using cached route for ${from.place_name} -> ${to.place_name}`);
        etaMin = cachedRoute.eta_min;
        polyline = cachedRoute.polyline;
      } else {
        // Call Distance Matrix API
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLoc.lat},${fromLoc.lng}&destinations=${toLoc.lat},${toLoc.lng}&mode=${travelMode}&key=${mapsKey}`
        );
        const data = await response.json();

        if (data.status !== "OK" || !data.rows[0]?.elements[0]) {
          console.error("Distance Matrix error:", data);
          continue;
        }

        const element = data.rows[0].elements[0];
        if (element.status !== "OK") {
          console.error("Element error:", element);
          continue;
        }

        etaMin = Math.ceil(element.duration.value / 60);

        // Get route polyline from Directions API
        const directionsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLoc.lat},${fromLoc.lng}&destination=${toLoc.lat},${toLoc.lng}&mode=${travelMode}&key=${mapsKey}`
        );
        const directionsData = await directionsResponse.json();
        
        if (directionsData.status === "OK" && directionsData.routes[0]) {
          polyline = directionsData.routes[0].overview_polyline.points;
        }

        // Cache the route
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days TTL

        await supabase.from("cache_routes").insert({
          origin_place_id: from.place_id,
          destination_place_id: to.place_id,
          mode: travelMode.toLowerCase(),
          time_bucket: timeBucket,
          eta_min: etaMin,
          polyline: polyline,
          expires_at: expiresAt.toISOString()
        });

        console.log(`Cached route: ${from.place_name} -> ${to.place_name} (${etaMin} min)`);
      }

      transfers.push({
        from_place_id: from.place_id,
        to_place_id: to.place_id,
        mode: travelMode.toLowerCase(),
        eta_min: etaMin,
        polyline: polyline
      });
    }

    // Save transfers to database
    await supabase.from("trip_transfers").delete().eq("day_id", dayId);
    
    if (transfers.length > 0) {
      await supabase.from("trip_transfers").insert(
        transfers.map(t => ({ ...t, day_id: dayId }))
      );
    }

    console.log(`Saved ${transfers.length} transfers for day ${day.day_number}`);

    return new Response(
      JSON.stringify({ success: true, transfers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error calculating logistics:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
