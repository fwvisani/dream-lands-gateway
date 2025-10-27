import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Utensils, Star, Navigation, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface TimelineItem {
  id: string;
  slot: string;
  kind: string;
  place_id?: string;
  place_name: string;
  estimated_duration_min?: number[];
  meal_type?: string;
  place_data?: any;
}

interface Transfer {
  from_place_id: string;
  to_place_id: string;
  mode: string;
  eta_min: number;
}

interface MobileDayTimelineProps {
  day: {
    id: string;
    day_number: number;
    date: string;
    city: string;
    summary: string;
    trip_timeline_items?: TimelineItem[];
    trip_transfers?: Transfer[];
  };
  onViewMap?: () => void;
}

const slotEmojis = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙"
};

const slotColors = {
  morning: "bg-orange-500/10 border-orange-500/20 text-orange-700",
  afternoon: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700",
  evening: "bg-purple-500/10 border-purple-500/20 text-purple-700",
  night: "bg-blue-500/10 border-blue-500/20 text-blue-700"
};

export const MobileDayTimeline = ({ day, onViewMap }: MobileDayTimelineProps) => {
  const [expanded, setExpanded] = useState(true);
  const items = day.trip_timeline_items || [];
  const transfers = day.trip_transfers || [];

  // Calculate total time
  const totalActivityTime = items.reduce((sum, item) => {
    if (item.estimated_duration_min) {
      return sum + ((item.estimated_duration_min[0] + item.estimated_duration_min[1]) / 2);
    }
    return sum;
  }, 0);

  const totalTravelTime = transfers.reduce((sum, t) => sum + (t.eta_min || 0), 0);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold">Day {day.day_number}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(day.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{day.city}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{Math.round((totalActivityTime + totalTravelTime) / 60)}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Navigation className="w-4 h-4" />
            <span>{items.length} stops</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {expanded && (
        <div className="p-4">
          {day.summary && (
            <p className="text-sm text-muted-foreground mb-4 pb-4 border-b">
              {day.summary}
            </p>
          )}

          <div className="space-y-3">
            {items.map((item, index) => {
              const transfer = transfers.find(t => t.from_place_id === item.place_id);
              
              return (
                <div key={item.id}>
                  {/* Activity Card */}
                  <div className="bg-background border rounded-lg p-3 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-2xl">{slotEmojis[item.slot as keyof typeof slotEmojis]}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm leading-tight mb-1">
                            {item.place_name}
                          </h4>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Clock className="w-3 h-3" />
                            {item.estimated_duration_min ? (
                              <span>
                                {item.estimated_duration_min[0]}-{item.estimated_duration_min[1]} min
                              </span>
                            ) : (
                              <span>2-3 hours</span>
                            )}
                          </div>

                          {item.place_data?.rating && (
                            <div className="flex items-center gap-1 text-xs">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{item.place_data.rating}</span>
                              {item.place_data.user_ratings_total && (
                                <span className="text-muted-foreground">
                                  ({item.place_data.user_ratings_total})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-xs ${slotColors[item.slot as keyof typeof slotColors]}`}
                      >
                        {item.kind === "meal" ? (
                          <>
                            <Utensils className="w-3 h-3 mr-1" />
                            {item.meal_type}
                          </>
                        ) : (
                          item.kind
                        )}
                      </Badge>
                    </div>

                    {item.place_data?.formatted_address && (
                      <div className="flex items-start gap-1 text-xs text-muted-foreground mt-2 pt-2 border-t">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{item.place_data.formatted_address}</span>
                      </div>
                    )}
                  </div>

                  {/* Transfer indicator */}
                  {transfer && transfer.eta_min && (
                    <div className="flex items-center gap-2 my-2 ml-4 text-xs text-muted-foreground">
                      <div className="w-0.5 h-8 bg-gradient-to-b from-border to-transparent" />
                      <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        <span>{transfer.eta_min} min {transfer.mode}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* View on Map Button */}
          {onViewMap && (
            <Button 
              variant="outline" 
              className="w-full mt-4 gap-2"
              onClick={onViewMap}
            >
              <MapPin className="w-4 h-4" />
              View Day on Map
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
