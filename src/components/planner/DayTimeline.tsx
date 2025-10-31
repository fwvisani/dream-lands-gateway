import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Utensils, Star } from "lucide-react";

interface TimelineItem {
  id: string;
  slot: string;
  kind: string;
  place_name: string;
  estimated_duration_min?: number[];
  meal_type?: string;
  place_data?: any;
}

interface DayTimelineProps {
  day: {
    id: string;
    day_number: number;
    date: string;
    city: string;
    summary: string;
    trip_timeline_items?: TimelineItem[];
  };
  isPublic?: boolean;
}

const slotIcons = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙"
};

const slotTimes = {
  morning: "09:00 - 12:00",
  afternoon: "14:00 - 17:00",
  evening: "19:00 - 21:00",
  night: "21:00+"
};

export const DayTimeline = ({ day }: DayTimelineProps) => {
  const items = day.trip_timeline_items || [];

  return (
    <Card className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">
            Day {day.day_number}: {day.city}
          </h3>
          <span className="text-sm text-muted-foreground">
            {new Date(day.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        </div>
        {day.summary && (
          <p className="text-muted-foreground">{day.summary}</p>
        )}
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex gap-4 pb-4 border-l-2 border-primary pl-4 relative"
          >
            {/* Timeline dot */}
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{slotIcons[item.slot as keyof typeof slotIcons]}</span>
                  <div>
                    <h4 className="font-medium">{item.place_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{slotTimes[item.slot as keyof typeof slotTimes]}</span>
                      {item.estimated_duration_min && (
                        <span>
                          • {item.estimated_duration_min[0]}-{item.estimated_duration_min[1]} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Badge variant="outline" className="capitalize">
                  {item.kind === "meal" ? (
                    <>
                      <Utensils className="w-3 h-3 mr-1" />
                      {item.meal_type}
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3 mr-1" />
                      {item.kind}
                    </>
                  )}
                </Badge>
              </div>

              {item.place_data && (
                <div className="mt-3 space-y-2">
                  {item.place_data.micro_copy && (
                    <p className="text-sm font-medium text-primary">
                      {item.place_data.micro_copy}
                    </p>
                  )}
                  {item.place_data.description && (
                    <p className="text-sm text-muted-foreground">
                      {item.place_data.description}
                    </p>
                  )}
                  {item.place_data.tip && (
                    <p className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                      💡 {item.place_data.tip}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.place_data.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{item.place_data.rating}</span>
                      </div>
                    )}
                    {item.place_data.formatted_address && (
                      <span className="truncate">{item.place_data.formatted_address}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
