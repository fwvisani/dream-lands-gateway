import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TripEditorProps {
  tripId: string;
  onEditComplete?: () => void;
}

export const TripEditor = ({ tripId, onEditComplete }: TripEditorProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "I can help you edit your trip! You can ask me to:\n• Swap activities (e.g., 'replace the museum with a beach')\n• Change meals (e.g., 'find a different restaurant for dinner on day 2')\n• Remove items (e.g., 'remove the afternoon activity on day 1')\n\nWhat would you like to change?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("edit-trip", {
        body: { 
          tripId,
          editRequest: input
        }
      });

      if (error) throw error;

      if (data.success) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message 
        }]);
        
        toast({
          title: "Trip updated!",
          description: "Your changes have been applied."
        });

        // Notify parent to refresh
        if (onEditComplete) {
          setTimeout(() => onEditComplete(), 1000);
        }
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message || "I couldn't make that change. Can you try rephrasing?"
        }]);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process your edit",
        variant: "destructive"
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Edit Trip</h3>
        <p className="text-sm text-muted-foreground">Chat with me to make changes</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="E.g., 'swap the museum with a park'"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
