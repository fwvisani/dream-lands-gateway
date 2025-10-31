import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Hotel, Star, Clock } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import { DayMiniMap } from "./DayMiniMap";

interface GridPlannerProps {
  trip: any;
}

export const GridPlanner = ({ trip }: GridPlannerProps) => {
  const intent = trip.trip_intents?.[0];
  const selectedHotel = trip.trip_hotels?.find((h: any) => h.is_selected);

  return (
    <div className="space-y-8">
      {/* Hotel Card at Top */}
      {selectedHotel && (
        <Card className="p-6 shadow-elevated">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Hotel className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{selectedHotel.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedHotel.formatted_address}</span>
                  </div>
                </div>
                {selectedHotel.score && (
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {(selectedHotel.score * 100).toFixed(0)}/100
                  </Badge>
                )}
              </div>
              {selectedHotel.rating && (
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{selectedHotel.rating}</span>
                    <span className="text-sm text-muted-foreground">
                      ({selectedHotel.user_ratings_total} reviews)
                    </span>
                  </div>
                  {selectedHotel.price_level && (
                    <span className="text-muted-foreground">
                      {"$".repeat(selectedHotel.price_level)}
                    </span>
                  )}
                </div>
              )}
              {selectedHotel.reason && (
                <p className="mt-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  💡 {selectedHotel.reason}
                </p>
              )}
              {selectedHotel.website && (
                <a 
                  href={selectedHotel.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Visit website →
                </a>
              )}
            </div>
            {selectedHotel.photos?.[0]?.photo_reference && (
              <img 
                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${selectedHotel.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
                alt={selectedHotel.name}
                className="w-48 h-32 object-cover rounded-lg shadow-card hidden lg:block"
              />
            )}
          </div>
        </Card>
      )}

      {/* Day Grid */}
      <div className="grid grid-cols-1 gap-8">
        {trip.trip_days?.map((day: any) => (
          <Card key={day.id} className="overflow-hidden shadow-card">
            {/* Day Header */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">
                  Day {day.day_number}: {day.city}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
              {day.summary && (
                <p className="text-muted-foreground">{day.summary}</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Activities - Takes 2 columns */}
              <div className="lg:col-span-2 space-y-4">
                {day.trip_timeline_items?.map((item: any, index: number) => (
                  <ActivityCard 
                    key={item.id} 
                    item={item} 
                    index={index}
                  />
                ))}
              </div>

              {/* Day Map - Takes 1 column */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <DayMiniMap 
                    day={day}
                    transfers={day.trip_transfers}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
