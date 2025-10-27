import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Calendar, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const { data: trip, isLoading } = useQuery({
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
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {trip.trip_days && trip.trip_days.length > 0 ? (
                <div className="space-y-6">
                  {trip.trip_days.map((day: any) => (
                    <Card key={day.id} className="p-6">
                      <h3 className="text-xl font-semibold mb-2">
                        Day {day.day_number}: {day.city}
                      </h3>
                      <p className="text-muted-foreground mb-4">{day.summary}</p>
                      
                      {day.trip_timeline_items && day.trip_timeline_items.length > 0 && (
                        <div className="space-y-3">
                          {day.trip_timeline_items.map((item: any) => (
                            <div key={item.id} className="pl-4 border-l-2 border-primary">
                              <p className="font-medium">{item.place_name}</p>
                              <p className="text-sm text-muted-foreground capitalize">{item.slot} • {item.kind}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  No itinerary details available yet
                </Card>
              )}
            </div>
            
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                <h3 className="font-semibold mb-4">Hotels</h3>
                {trip.trip_hotels && trip.trip_hotels.length > 0 ? (
                  <div className="space-y-4">
                    {trip.trip_hotels.map((hotel: any) => (
                      <div key={hotel.id}>
                        <p className="font-medium">{hotel.name}</p>
                        <p className="text-sm text-muted-foreground">{hotel.formatted_address}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hotels selected yet</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripDetails;
