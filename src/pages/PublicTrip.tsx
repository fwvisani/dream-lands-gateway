import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DayTimeline } from "@/components/planner/DayTimeline";
import { TripMap } from "@/components/planner/TripMap";
import { Badge } from "@/components/ui/badge";
import { Copy, MapPin, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

export default function PublicTrip() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          *,
          profiles!trips_user_id_fkey(full_name, avatar_url, username),
          trip_intents(*),
          trip_days(
            *,
            trip_timeline_items(*),
            trip_transfers(*)
          ),
          trip_hotels(*)
        `)
        .eq("id", tripId)
        .single();

      if (error || !data) {
        toast({
          title: "Viagem não encontrada",
          description: "Esta viagem não existe ou não é pública",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      // Check visibility
      if (data.visibility === "private" && data.user_id !== user?.id) {
        toast({
          title: "Acesso negado",
          description: "Esta viagem é privada",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setTrip(data);
      setLoading(false);
    };

    fetchTrip();
  }, [tripId, user, navigate, toast]);

  const handleClone = async () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para clonar viagens",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    setCloning(true);
    try {
      // Create new trip
      const { data: newTrip, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          run_id: crypto.randomUUID(),
          title: `${trip.title} (cópia)`,
          status: "active",
          visibility: "private"
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Copy intent
      const intent = trip.trip_intents[0];
      await supabase.from("trip_intents").insert({
        trip_id: newTrip.id,
        ...intent,
        id: undefined
      });

      // Copy days and items
      for (const day of trip.trip_days) {
        const { data: newDay } = await supabase
          .from("trip_days")
          .insert({
            trip_id: newTrip.id,
            date: day.date,
            day_number: day.day_number,
            city: day.city,
            tzid: day.tzid,
            summary: day.summary
          })
          .select()
          .single();

        if (newDay) {
          // Copy timeline items
          for (const item of day.trip_timeline_items) {
            await supabase.from("trip_timeline_items").insert({
              day_id: newDay.id,
              ...item,
              id: undefined
            });
          }

          // Copy transfers
          for (const transfer of day.trip_transfers) {
            await supabase.from("trip_transfers").insert({
              day_id: newDay.id,
              ...transfer,
              id: undefined
            });
          }
        }
      }

      // Copy hotels
      for (const hotel of trip.trip_hotels) {
        await supabase.from("trip_hotels").insert({
          trip_id: newTrip.id,
          ...hotel,
          id: undefined
        });
      }

      toast({
        title: "Viagem clonada!",
        description: "Você pode editá-la agora"
      });
      navigate(`/trip/${newTrip.id}`);
    } catch (error) {
      console.error("Clone error:", error);
      toast({
        title: "Erro ao clonar",
        description: "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setCloning(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "Compartilhe esta viagem"
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const intent = trip.trip_intents[0];
  const destination = intent?.destinations?.[0];
  const mapMarkers = trip.trip_days?.flatMap((day: any) =>
    day.trip_timeline_items?.map((item: any) => ({
      position: item.place_data?.geo || { lat: 0, lng: 0 },
      title: item.place_name || item.kind,
      day: day.day_number
    }))
  ) || [];

  return (
    <>
      <Helmet>
        <title>{trip.title} - Dream Lands</title>
        <meta name="description" content={`Viagem de ${trip.profiles?.full_name || 'usuário'} para ${destination?.city}`} />
        <meta property="og:title" content={trip.title} />
        <meta property="og:description" content={`Roteiro para ${destination?.city} - ${trip.trip_days?.length} dias`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                {trip.profiles?.avatar_url && (
                  <img 
                    src={trip.profiles.avatar_url} 
                    alt={trip.profiles.full_name}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold">{trip.title}</h1>
                  <p className="text-muted-foreground">
                    por {trip.profiles?.full_name || "Anônimo"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {destination?.city}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {trip.trip_days?.length} dias
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {intent?.travelers} {intent?.travelers === 1 ? "viajante" : "viajantes"}
                </Badge>
              </div>

              {trip.notices && trip.notices.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  💡 {trip.notices[0]}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShare}>
                <Copy className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button onClick={handleClone} disabled={cloning}>
                {cloning ? "Clonando..." : "Clonar Viagem"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Map */}
        {mapMarkers.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Mapa da Viagem</h2>
            <TripMap markers={mapMarkers} />
          </Card>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Roteiro</h2>
          {trip.trip_days?.map((day: any) => (
            <DayTimeline 
              key={day.id} 
              day={day}
              isPublic={true}
            />
          ))}
        </div>

        {/* Hotels */}
        {trip.trip_hotels?.filter((h: any) => h.is_selected).length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Hospedagem</h2>
            <div className="space-y-3">
              {trip.trip_hotels
                .filter((h: any) => h.is_selected)
                .map((hotel: any) => (
                  <div key={hotel.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{hotel.name}</h3>
                      <p className="text-sm text-muted-foreground">{hotel.formatted_address}</p>
                      {hotel.rating && (
                        <p className="text-sm">⭐ {hotel.rating} ({hotel.user_ratings_total} avaliações)</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
