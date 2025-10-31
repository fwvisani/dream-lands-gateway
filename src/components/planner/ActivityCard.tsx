import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Utensils, Star, Info } from "lucide-react";
import { useState } from "react";

interface ActivityCardProps {
  item: any;
  index: number;
}

const slotIcons = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙"
};

const slotColors = {
  morning: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
  afternoon: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
  evening: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  night: "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700"
};

const slotTimes = {
  morning: "09:00 - 12:00",
  afternoon: "14:00 - 17:00",
  evening: "19:00 - 21:00",
  night: "21:00+"
};

export const ActivityCard = ({ item, index }: ActivityCardProps) => {
  const [imageError, setImageError] = useState(false);
  const hasPhoto = item.place_data?.photos?.[0]?.photo_reference && !imageError;

  return (
    <Card className={`p-4 transition-smooth hover:shadow-elevated border-l-4 ${slotColors[item.slot as keyof typeof slotColors]}`}>
      <div className="flex gap-4">
        {/* Order Number & Time */}
        <div className="flex-shrink-0 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <span className="text-xl font-bold text-primary">{index + 1}</span>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {slotTimes[item.slot as keyof typeof slotTimes].split(" - ")[0]}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{slotIcons[item.slot as keyof typeof slotIcons]}</span>
                <h4 className="font-semibold text-lg">{item.place_name}</h4>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
                
                {item.estimated_duration_min && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{item.estimated_duration_min[0]}-{item.estimated_duration_min[1]} min</span>
                  </div>
                )}

                {item.place_data?.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{item.place_data.rating}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Photo */}
            {hasPhoto && (
              <img 
                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photo_reference=${item.place_data.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
                alt={item.place_name}
                className="w-24 h-24 object-cover rounded-lg shadow-card flex-shrink-0"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Rich Content */}
          {item.place_data && (
            <div className="mt-3 space-y-2">
              {item.place_data.micro_copy && (
                <p className="text-sm font-medium text-primary">
                  {item.place_data.micro_copy}
                </p>
              )}
              
              {item.place_data.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.place_data.description}
                </p>
              )}

              {item.place_data.tip && (
                <div className="flex gap-2 items-start bg-muted/50 p-3 rounded-lg">
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {item.place_data.tip}
                  </p>
                </div>
              )}

              {item.place_data.formatted_address && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{item.place_data.formatted_address}</span>
                </div>
              )}

              {/* Duration details */}
              {(item.assumptions || item.risks) && (
                <details className="text-xs text-muted-foreground mt-2">
                  <summary className="cursor-pointer hover:text-foreground">
                    View duration details
                  </summary>
                  <div className="mt-2 space-y-1 pl-4">
                    {item.assumptions && (
                      <div>
                        <strong>Assumptions:</strong>
                        <ul className="list-disc pl-4">
                          {item.assumptions.map((a: string, i: number) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.risks && (
                      <div>
                        <strong>Considerations:</strong>
                        <ul className="list-disc pl-4">
                          {item.risks.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.confidence && (
                      <div>
                        <strong>Confidence:</strong> {(item.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
