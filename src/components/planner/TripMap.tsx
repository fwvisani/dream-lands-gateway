/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Location {
  lat: number;
  lng: number;
}

interface MapMarker {
  position: Location;
  title: string;
  type: "activity" | "meal" | "hotel";
}

interface TripMapProps {
  markers: MapMarker[];
  center?: Location;
}

export const TripMap = ({ markers, center }: TripMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
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
  }, []);

  const initMap = () => {
    if (!mapRef.current || !(window as any).google?.maps) return;

    const defaultCenter = center || { lat: 0, lng: 0 };
    
    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: markers.length > 0 ? markers[0].position : defaultCenter,
      zoom: 13,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    // Add markers
    const bounds = new (window as any).google.maps.LatLngBounds();
    
    markers.forEach((marker) => {
      const mapMarker = new (window as any).google.maps.Marker({
        position: marker.position,
        map: map,
        title: marker.title,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          fillColor: marker.type === "hotel" ? "#3b82f6" : marker.type === "meal" ? "#ef4444" : "#10b981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 8,
        }
      });

      bounds.extend(marker.position);

      // Add info window
      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: `<div style="padding: 8px;"><strong>${marker.title}</strong></div>`
      });

      mapMarker.addListener("click", () => {
        infoWindow.open(map, mapMarker);
      });
    });

    // Fit map to markers
    if (markers.length > 1) {
      map.fitBounds(bounds);
    }

    setLoading(false);
  };

  if (error) {
    return (
      <Card className="h-full flex items-center justify-center p-6">
        <p className="text-muted-foreground">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="h-full relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
    </Card>
  );
};
