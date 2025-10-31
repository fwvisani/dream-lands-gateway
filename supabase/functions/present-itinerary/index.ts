import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimelineItem {
  id: string;
  place_name: string;
  place_id: string;
  kind: string;
  slot: string;
  meal_type?: string;
  place_data?: any;
  estimated_duration_min?: number[];
}

interface DayData {
  id: string;
  day_number: number;
  date: string;
  city: string;
  summary?: string;
  timeline_items: TimelineItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch trip data
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        trip_intents (
          destinations,
          interests,
          pace,
          budget_band,
          travelers
        ),
        trip_days (
          id,
          day_number,
          date,
          city,
          summary,
          trip_timeline_items (
            id,
            place_name,
            place_id,
            kind,
            slot,
            meal_type,
            place_data,
            estimated_duration_min,
            order_index
          )
        )
      `)
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      throw new Error(`Failed to fetch trip: ${tripError?.message}`);
    }

    const intent = trip.trip_intents?.[0];
    const destinations = intent?.destinations as any[] || [];
    const mainDest = destinations[0];

    // Process each day with AI-generated micro-copy
    for (const day of trip.trip_days || []) {
      const dayData = day as DayData;
      const items = (dayData.timeline_items || []).sort((a, b) => 
        (a as any).order_index - (b as any).order_index
      );

      // Generate day summary if missing
      if (!dayData.summary) {
        const daySummaryPrompt = `Create a brief, engaging 1-sentence summary for Day ${dayData.day_number} in ${dayData.city}.
Activities: ${items.map(i => i.place_name).join(', ')}
Keep it under 100 characters, exciting, and travel-focused.`;

        const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a travel content writer. Write concise, engaging copy.' },
              { role: 'user', content: daySummaryPrompt }
            ],
          }),
        });

        const summaryData = await summaryResponse.json();
        const summary = summaryData.choices?.[0]?.message?.content?.trim();

        if (summary) {
          await supabase
            .from('trip_days')
            .update({ summary })
            .eq('id', dayData.id);
        }
      }

      // Enhance each timeline item with micro-copy
      for (const item of items) {
        if (!item.place_data?.description || !item.place_data?.micro_copy) {
          const itemPrompt = `Create engaging micro-copy for this ${item.kind}:
Name: ${item.place_name}
Type: ${item.kind} ${item.meal_type ? `(${item.meal_type})` : ''}
Time: ${item.slot}
Context: Day ${dayData.day_number} in ${dayData.city}, ${mainDest?.country || 'destination'}
Traveler interests: ${intent?.interests?.join(', ') || 'general tourism'}

Return a JSON object with:
{
  "description": "2-3 sentence engaging description (max 200 chars)",
  "micro_copy": "Short punchy tagline (max 60 chars)",
  "tip": "Quick insider tip (max 100 chars, optional)"
}`;

          const itemResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You are a travel copywriter. Return only valid JSON, no markdown.' },
                { role: 'user', content: itemPrompt }
              ],
            }),
          });

          const itemData = await itemResponse.json();
          let copyData: any = {};
          
          try {
            const content = itemData.choices?.[0]?.message?.content?.trim() || '{}';
            const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
            copyData = JSON.parse(cleaned);
          } catch (e) {
            console.error('Failed to parse copy data:', e);
            copyData = {
              description: `Experience ${item.place_name}`,
              micro_copy: item.kind === 'activity' ? 'Must-see attraction' : 'Great dining spot'
            };
          }

          // Merge with existing place_data
          const updatedPlaceData = {
            ...(item.place_data || {}),
            description: copyData.description || item.place_data?.description,
            micro_copy: copyData.micro_copy || item.place_data?.micro_copy,
            tip: copyData.tip || item.place_data?.tip
          };

          await supabase
            .from('trip_timeline_items')
            .update({ place_data: updatedPlaceData })
            .eq('id', item.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Itinerary presentation enhanced'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in present-itinerary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
