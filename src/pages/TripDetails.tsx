import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Calendar, Users, Loader2, Hotel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DayTimeline } from "@/components/planner/DayTimeline";
import { TripMap } from "@/components/planner/TripMap";
import { useToast } from "@/hooks/use-toast";

const TripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: trip, isLoading, refetch } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          *,
          trip_intents (*),
          trip_hotels (*),
          trip_days (
            *,
            trip_timeline_items (
              *,
              trip_alternatives (*)
            ),
            trip_transfers (*)
          )
        `)
        .eq("id", tripId)
        .order("day_number", { 
          foreignTable: "trip_days",
          ascending: true 
        })
        .order("order_index", {
          foreignTable: "trip_days.trip_timeline_items",
          ascending: true
        })
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
    refetchInterval: (query) => {
      // Auto-refresh every 3 seconds if trip is still in draft
      return query.state.data?.status === "draft" ? 3000 : false;
    },
  });

  // Trigger itinerary generation when trip is in draft
  useEffect(() => {
    if (trip?.status === "draft" && Array.isArray(trip?.trip_intents) && trip.trip_intents.length > 0) {
      const generateItinerary = async () => {
        try {
          await supabase.functions.invoke("generate-itinerary", {
            body: { tripId: trip.id }
          });
        } catch (error: any) {
          console.error("Error generating itinerary:", error);
          toast({
            title: "Error",
            description: "Failed to generate itinerary. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      // Delay to avoid immediate call on mount
      const timer = setTimeout(generateItinerary, 1000);
      return () => clearTimeout(timer);
    }
  }, [trip?.id, trip?.status]);

  // Prepare map markers
  const mapMarkers = [];
  if (trip?.trip_days) {
    trip.trip_days.forEach((day: any) => {
      day.trip_timeline_items?.forEach((item: any) => {
        if (item.place_data?.geometry?.location) {
          mapMarkers.push({
            position: item.place_data.geometry.location,
            title: item.place_name,
            type: item.kind
          });
        }
      });
    });
  }
  
  if (trip?.trip_hotels) {
    trip.trip_hotels.forEach((hotel: any) => {
      if (hotel.is_selected && hotel.geo) {
        mapMarkers.push({
          position: hotel.geo,
          title: hotel.name,
          type: "hotel"
        });
      }
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Trip not found</h1>
          <Button onClick={() => navigate("/planner")}>Back to Trips</Button>
        </div>
      </div>
    );
  }

  const intent = trip.trip_intents?.[0];
  const destinations = intent?.destinations as any[];
  const mainDestination = destinations?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate("/planner")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trips
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{trip.title}</h1>
          
          <div className="flex flex-wrap gap-6 text-muted-foreground">
            {mainDestination && (
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{mainDestination.city}, {mainDestination.country}</span>
              </div>
            )}
            
            {intent && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(intent.start_date).toLocaleDateString()} - {new Date(intent.end_date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{intent.travelers} {intent.travelers === 1 ? 'traveler' : 'travelers'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {trip.status === "draft" ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-2xl font-semibold mb-2">Planning your trip...</h3>
            <p className="text-muted-foreground">
              Our AI is working on creating the perfect itinerary for you. This usually takes 1-2 minutes.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {trip.trip_days && trip.trip_days.length > 0 ? (
                trip.trip_days.map((day: any) => (
                  <DayTimeline key={day.id} day={day} />
                ))
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  No itinerary details available yet
                </Card>
              )}
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              {/* Map */}
              <div className="sticky top-24">
                <TripMap markers={mapMarkers} />
              </div>

              {/* Hotels */}
              {trip.trip_hotels && trip.trip_hotels.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Hotel className="w-5 h-5" />
                    <h3 className="font-semibold">Accommodation</h3>
                  </div>
                  <div className="space-y-4">
                    {trip.trip_hotels
                      .filter((hotel: any) => hotel.is_selected)
                      .map((hotel: any) => (
                        <div key={hotel.id} className="border-l-2 border-primary pl-3">
                          <p className="font-medium">{hotel.name}</p>
                          {hotel.rating && (
                            <p className="text-sm text-muted-foreground">
                              ⭐ {hotel.rating} ({hotel.user_ratings_total} reviews)
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {hotel.formatted_address}
                          </p>
                          {hotel.website && (
                            <a 
                              href={hotel.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline mt-1 inline-block"
                            >
                              Visit website →
                            </a>
                          )}
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripDetails;
