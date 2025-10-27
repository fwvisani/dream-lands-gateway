import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const Planner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("trips")
        .select(`
          *,
          trip_intents (
            destinations,
            start_date,
            end_date,
            travelers
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Dream Lands Planner</h1>
          <p className="text-muted-foreground mb-8">Sign in to start planning your dream trip</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Trips</h1>
            <p className="text-muted-foreground">Plan, share, and explore your travel dreams</p>
          </div>
          <Button 
            size="lg" 
            onClick={() => navigate("/planner/create")}
            className="gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Trip
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))}
          </div>
        ) : trips && trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const intent = trip.trip_intents?.[0];
              const destinations = intent?.destinations as any[];
              const mainDestination = destinations?.[0];
              
              return (
                <Card 
                  key={trip.id} 
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  <h3 className="text-xl font-semibold mb-4">{trip.title}</h3>
                  
                  {mainDestination && (
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{mainDestination.city}, {mainDestination.country}</span>
                    </div>
                  )}
                  
                  {intent && (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(intent.start_date).toLocaleDateString()} - {new Date(intent.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{intent.travelers} {intent.travelers === 1 ? 'traveler' : 'travelers'}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground capitalize">{trip.status}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-semibold mb-2">No trips yet</h3>
            <p className="text-muted-foreground mb-6">Start planning your first adventure with AI-powered assistance</p>
            <Button onClick={() => navigate("/planner/create")}>
              Create Your First Trip
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Planner;
