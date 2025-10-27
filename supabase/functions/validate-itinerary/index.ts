import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate time feasibility for a day
function validateDayTiming(day: any): string[] {
  const issues: string[] = [];
  let currentTime = 0; // minutes from midnight

  for (let i = 0; i < day.timeline.length; i++) {
    const item = day.timeline[i];
    const nextItem = day.timeline[i + 1];
    
    // Check if duration is reasonable
    const duration = item.estimated_duration_min?.[1] || 120;
    if (duration > 480) {
      issues.push(`${item.place_name || item.kind}: duração muito longa (${Math.round(duration/60)}h)`);
    }

    // Check if travel time exists for next item
    if (nextItem && day.transfers) {
      const transfer = day.transfers.find(
        (t: any) => t.from_place_id === item.place_id && t.to_place_id === nextItem.place_id
      );
      if (!transfer) {
        issues.push(`Falta tempo de deslocamento entre ${item.place_name} e ${nextItem.place_name}`);
      } else if (transfer.eta_min > 60) {
        issues.push(`Deslocamento longo (${transfer.eta_min}min) entre ${item.place_name} e ${nextItem.place_name}`);
      }
    }

    currentTime += duration;
  }

  // Check total day duration
  if (currentTime > 960) { // 16 hours
    issues.push(`Dia muito longo (${Math.round(currentTime/60)}h total) - considere reduzir atividades`);
  }

  return issues;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Validating itinerary:", tripId);

    // Fetch trip with all related data
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select(`
        *,
        trip_intents(*),
        trip_days(
          *,
          trip_timeline_items(*),
          trip_transfers(*)
        )
      `)
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      throw new Error("Trip not found");
    }

    const notices: string[] = [];
    const hints: string[] = [];

    // Validate each day
    for (const day of trip.trip_days) {
      const dayIssues = validateDayTiming(day);
      notices.push(...dayIssues.map(issue => `Dia ${day.day_number}: ${issue}`));
    }

    // Check meal distribution
    for (const day of trip.trip_days) {
      const meals = day.trip_timeline_items.filter((item: any) => item.kind === "meal");
      if (meals.length < 2) {
        notices.push(`Dia ${day.day_number}: poucas refeições planejadas (${meals.length})`);
      }
    }

    // Check hotel selection
    const { data: hotels } = await supabase
      .from("trip_hotels")
      .select("*")
      .eq("trip_id", tripId);

    const selectedHotels = hotels?.filter(h => h.is_selected);
    if (!selectedHotels || selectedHotels.length === 0) {
      hints.push("Nenhum hotel selecionado");
    }

    // Check for missing place data
    for (const day of trip.trip_days) {
      for (const item of day.trip_timeline_items) {
        if (!item.place_id && item.kind === "activity") {
          notices.push(`Dia ${day.day_number}: ${item.place_name} sem place_id`);
        }
      }
    }

    // Validation passed
    console.log(`Validation complete: ${notices.length} notices, ${hints.length} hints`);

    return new Response(
      JSON.stringify({
        valid: notices.length === 0,
        notices,
        hints,
        summary: notices.length === 0 
          ? "Itinerário validado com sucesso" 
          : `${notices.length} avisos encontrados`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error validating itinerary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
