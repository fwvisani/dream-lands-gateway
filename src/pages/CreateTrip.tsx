import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TripChatInterface } from "@/components/planner/TripChatInterface";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CreateTrip = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate("/planner")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trips
        </Button>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Create Your Trip</h1>
            <p className="text-muted-foreground">
              Tell me about your dream trip and I'll help you plan it
            </p>
          </div>
          
          <TripChatInterface />
        </div>
      </div>
    </div>
  );
};

export default CreateTrip;
