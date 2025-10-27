import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ShareTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: any;
  onShared?: () => void;
}

export const ShareTripDialog = ({ open, onOpenChange, trip, onShared }: ShareTripDialogProps) => {
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<string>("public");
  const [isSharing, setIsSharing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleShare = async () => {
    if (!user) return;

    setIsSharing(true);
    try {
      const intent = trip.trip_intents?.[0];
      const destinations = intent?.destinations as any[];
      const mainDest = destinations?.[0];
      
      // Create post content
      const postContent = caption || `Check out my trip to ${mainDest?.city || 'an amazing destination'}! 🌍✈️\n\n${trip.trip_days?.length || 0} days of adventure planned with AI.`;

      // Create post
      const { error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: postContent,
          visibility: visibility
        });

      if (postError) throw postError;

      // Update trip visibility to match post
      await supabase
        .from("trips")
        .update({ visibility: visibility })
        .eq("id", trip.id);

      toast({
        title: "Shared to feed!",
        description: "Your trip has been shared with your network."
      });

      onOpenChange(false);
      if (onShared) onShared();
    } catch (error: any) {
      console.error("Error sharing trip:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to share trip",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const intent = trip?.trip_intents?.[0];
  const destinations = intent?.destinations as any[];
  const mainDest = destinations?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Trip to Feed</DialogTitle>
          <DialogDescription>
            Share your {mainDest?.city || ''} itinerary with your network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder={`Just planned an amazing ${trip.trip_days?.length || 0}-day trip to ${mainDest?.city || 'my dream destination'}...`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Who can see this?</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Everyone</SelectItem>
                <SelectItem value="followers">Followers - Only people you follow</SelectItem>
                <SelectItem value="private">Private - Only you</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {trip.trip_days && trip.trip_days.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">Trip Preview</p>
              <p className="text-sm text-muted-foreground">
                📍 {mainDest?.city}, {mainDest?.country}
                <br />
                📅 {intent?.start_date} to {intent?.end_date}
                <br />
                🗓️ {trip.trip_days.length} days • {trip.trip_days.reduce((sum: number, day: any) => sum + (day.trip_timeline_items?.length || 0), 0)} activities
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isSharing}>
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              "Share to Feed"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
