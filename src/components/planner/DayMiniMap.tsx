import { Card } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DayMiniMapProps {
  day: any;
  transfers?: any[];
}

export const DayMiniMap = ({ day, transfers }: DayMiniMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    const loadGoogleMaps = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("Google Maps API key not found");
        return;
      }

      if (window.google?.maps) {
        initMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) return;

      const items = day.trip_timeline_items || [];
      const locations = items
        .filter((item: any) => item.place_data?.geometry?.location)
        .map((item: any) => ({
          position: item.place_data.geometry.location,
          title: item.place_name,
          kind: item.kind
        }));

      if (locations.length === 0) return;

      const map = new google.maps.Map(mapRef.current, {
        zoom: 13,
        center: locations[0].position,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      const bounds = new google.maps.LatLngBounds();

      // Add markers
      locations.forEach((loc, index) => {
        const marker = new google.maps.Marker({
          position: loc.position,
          map: map,
          label: {
            text: (index + 1).toString(),
            color: "white",
            fontWeight: "bold"
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2
          }
        });

        bounds.extend(loc.position);
      });

      // Draw routes from transfers
      if (transfers && transfers.length > 0) {
        transfers.forEach((transfer: any) => {
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

      map.fitBounds(bounds);
      setMapLoaded(true);
    };

    loadGoogleMaps();
  }, [day, transfers, mapLoaded]);

  const locations = day.trip_timeline_items?.filter(
    (item: any) => item.place_data?.geometry?.location
  ) || [];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Day Route</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Navigation className="w-3 h-3" />
            <span>{locations.length} stops</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-80 bg-muted"
      />

      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <p className="text-sm text-muted-foreground">No locations available</p>
        </div>
      )}
    </Card>
  );
};
