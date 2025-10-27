import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Location {
  lat: number;
  lng: number;
}

interface DayItem {
  place_id: string;
  place_name: string;
  place_data?: any;
  slot: string;
}

interface Transfer {
  polyline?: string;
  eta_min?: number;
}

interface DayMapViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: {
    day_number: number;
    date: string;
    city: string;
    trip_timeline_items?: DayItem[];
    trip_transfers?: Transfer[];
  };
}

export const DayMapView = ({ open, onOpenChange, day }: DayMapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      setLoading(false);
      return;
    }

    // Check if Google Maps is already loaded
    if ((window as any).google?.maps) {
      initMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    script.onerror = () => {
      setError("Failed to load Google Maps");
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [open]);

  const initMap = () => {
    if (!mapRef.current || !(window as any).google?.maps || !day.trip_timeline_items) return;

    const items = day.trip_timeline_items.filter(item => 
      item.place_data?.geometry?.location
    );

    if (items.length === 0) {
      setError("No locations available to display");
      setLoading(false);
      return;
    }

    const google = (window as any).google;
    
    const map = new google.maps.Map(mapRef.current, {
      zoom: 13,
      center: items[0].place_data.geometry.location,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    const bounds = new google.maps.LatLngBounds();

    // Color scheme for different times of day
    const slotColors: any = {
      morning: "#f97316", // orange
      afternoon: "#eab308", // yellow
      evening: "#a855f7", // purple
      night: "#3b82f6" // blue
    };

    // Add numbered markers
    items.forEach((item, index) => {
      const position = item.place_data.geometry.location;
      
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        label: {
          text: `${index + 1}`,
          color: "white",
          fontSize: "14px",
          fontWeight: "bold"
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: slotColors[item.slot] || "#10b981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 12,
        }
      });

      bounds.extend(position);

      // Info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <strong>${item.place_name}</strong>
            <p style="margin: 4px 0; color: #666; font-size: 12px; text-transform: capitalize;">
              ${item.slot}
            </p>
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });
    });

    // Draw routes between points
    if (day.trip_transfers) {
      day.trip_transfers.forEach((transfer) => {
        if (transfer.polyline) {
          const path = google.maps.geometry.encoding.decodePath(transfer.polyline);
          
          new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: "#3b82f6",
            strokeOpacity: 0.6,
            strokeWeight: 3,
            map: map
          });
        }
      });
    }

    // Fit bounds
    if (items.length > 1) {
      map.fitBounds(bounds);
      // Add padding
      map.panBy(0, -50);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>
            Day {day.day_number} - {day.city}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 h-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {error ? (
            <div className="flex items-center justify-center h-full p-6">
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
