import { Button } from "@/components/ui/button";
import { MapPin, Compass, Users } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Dream destinations awaiting exploration"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm shadow-card border border-border">
            <Compass className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Plan. Share. Explore.</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Turn Your Travel
            <br />
            <span className="text-gradient">Dreams Into Reality</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            The social network where you plan incredible journeys with AI,
            share your adventures, and inspire others to explore the world.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button variant="hero" size="lg" className="min-w-[200px]">
              Start Planning
            </Button>
            <Button variant="outline" size="lg" className="min-w-[200px] bg-card/80 backdrop-blur-sm">
              Explore Trips
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/60 backdrop-blur-sm shadow-card border border-border transition-smooth hover:shadow-elevated hover:scale-105">
              <div className="w-12 h-12 rounded-full gradient-hero flex items-center justify-center">
                <Compass className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">AI-Powered Planning</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized itineraries crafted by advanced AI
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/60 backdrop-blur-sm shadow-card border border-border transition-smooth hover:shadow-elevated hover:scale-105">
              <div className="w-12 h-12 rounded-full gradient-sunset flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Social Network</h3>
              <p className="text-sm text-muted-foreground">
                Share experiences and inspire fellow travelers
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/60 backdrop-blur-sm shadow-card border border-border transition-smooth hover:shadow-elevated hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <MapPin className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Smart Logistics</h3>
              <p className="text-sm text-muted-foreground">
                Routes, times, and places optimized for you
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
