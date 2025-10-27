-- Travel Planner Tables

-- Trips/Itineraries
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'followers', 'public')),
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trip Intent (preferences collected via chat)
CREATE TABLE public.trip_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE UNIQUE,
  destinations JSONB NOT NULL, -- [{"city": "Rio", "country": "BR", "tzid": "America/Sao_Paulo"}]
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  travelers INTEGER NOT NULL DEFAULT 1,
  budget_band TEXT CHECK (budget_band IN ('low', 'medium', 'high', 'luxury')),
  interests TEXT[],
  dietary_restrictions TEXT[],
  accessibility_needs TEXT[],
  pace TEXT CHECK (pace IN ('relaxed', 'moderate', 'active')),
  wake_time TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Hotels
CREATE TABLE public.trip_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  score DECIMAL(3,2),
  reason TEXT,
  formatted_address TEXT,
  geo JSONB, -- {"lat": -22.97, "lng": -43.18}
  rating DECIMAL(2,1),
  user_ratings_total INTEGER,
  price_level INTEGER,
  phone TEXT,
  website TEXT,
  photos JSONB,
  distance_to_day_centroid JSONB, -- {"day1": 12, "day2": 9}
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Days
CREATE TABLE public.trip_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  city TEXT NOT NULL,
  tzid TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, day_number)
);

-- Timeline Items (activities, meals, etc.)
CREATE TABLE public.trip_timeline_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID NOT NULL REFERENCES public.trip_days(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('morning', 'afternoon', 'evening', 'night')),
  kind TEXT NOT NULL CHECK (kind IN ('activity', 'meal', 'transfer', 'rest')),
  place_id TEXT,
  place_name TEXT,
  place_data JSONB, -- full place details from Maps
  estimated_duration_min INTEGER[2], -- [min, max]
  duration_source TEXT,
  confidence DECIMAL(3,2),
  assumptions TEXT[],
  risks TEXT[],
  evidence_snippets TEXT[],
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(day_id, order_index)
);

-- Alternatives for timeline items
CREATE TABLE public.trip_alternatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_item_id UUID NOT NULL REFERENCES public.trip_timeline_items(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  place_data JSONB,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Transfers between places
CREATE TABLE public.trip_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID NOT NULL REFERENCES public.trip_days(id) ON DELETE CASCADE,
  from_place_id TEXT NOT NULL,
  to_place_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('car', 'transit', 'walk', 'bike')),
  eta_min INTEGER,
  polyline TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Cache tables for optimization

-- City catalog cache
CREATE TABLE public.cache_city_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  filters JSONB,
  place_ids TEXT[],
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(city, country, category, version)
);

-- Place details cache
CREATE TABLE public.cache_place_details (
  place_id TEXT NOT NULL PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Routes/matrix cache
CREATE TABLE public.cache_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_place_id TEXT NOT NULL,
  destination_place_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  time_bucket TEXT NOT NULL, -- '08-12', '12-16', '16-20'
  eta_min INTEGER,
  polyline TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(origin_place_id, destination_place_id, mode, time_bucket, version)
);

-- Duration estimates cache
CREATE TABLE public.cache_duration_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,
  profile_key TEXT NOT NULL, -- hashed combination of pace, interests
  season TEXT, -- 'spring', 'summer', 'fall', 'winter'
  duration_min INTEGER[2],
  confidence DECIMAL(3,2),
  assumptions TEXT[],
  risks TEXT[],
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(place_id, profile_key, season, version)
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_city_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_place_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_duration_estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public trips" ON public.trips
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view followers trips" ON public.trips
  FOR SELECT USING (
    visibility = 'followers' AND EXISTS (
      SELECT 1 FROM follows 
      WHERE follower_id = auth.uid() AND following_id = trips.user_id
    )
  );

CREATE POLICY "Users can create their own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trip_intents
CREATE POLICY "Users can view intents of accessible trips" ON public.trip_intents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_intents.trip_id 
      AND (trips.user_id = auth.uid() OR trips.visibility = 'public' OR 
        (trips.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = trips.user_id
        ))
      )
    )
  );

CREATE POLICY "Users can create intents for their trips" ON public.trip_intents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_intents.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Users can update intents of their trips" ON public.trip_intents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_intents.trip_id AND trips.user_id = auth.uid())
  );

-- RLS Policies for trip_hotels
CREATE POLICY "Users can view hotels of accessible trips" ON public.trip_hotels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_hotels.trip_id 
      AND (trips.user_id = auth.uid() OR trips.visibility = 'public' OR 
        (trips.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = trips.user_id
        ))
      )
    )
  );

CREATE POLICY "Users can manage hotels of their trips" ON public.trip_hotels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_hotels.trip_id AND trips.user_id = auth.uid())
  );

-- RLS Policies for trip_days
CREATE POLICY "Users can view days of accessible trips" ON public.trip_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_days.trip_id 
      AND (trips.user_id = auth.uid() OR trips.visibility = 'public' OR 
        (trips.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = trips.user_id
        ))
      )
    )
  );

CREATE POLICY "Users can manage days of their trips" ON public.trip_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  );

-- RLS Policies for trip_timeline_items
CREATE POLICY "Users can view timeline items of accessible trips" ON public.trip_timeline_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_days 
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = trip_timeline_items.day_id 
      AND (trips.user_id = auth.uid() OR trips.visibility = 'public' OR 
        (trips.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = trips.user_id
        ))
      )
    )
  );

CREATE POLICY "Users can manage timeline items of their trips" ON public.trip_timeline_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_days 
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = trip_timeline_items.day_id AND trips.user_id = auth.uid()
    )
  );

-- Similar policies for alternatives and transfers
CREATE POLICY "Users can view alternatives of accessible trips" ON public.trip_alternatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_timeline_items 
      JOIN trip_days ON trip_days.id = trip_timeline_items.day_id
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_timeline_items.id = trip_alternatives.timeline_item_id 
      AND (trips.user_id = auth.uid() OR trips.visibility = 'public' OR 
        (trips.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = trips.user_id
        ))
      )
    )
  );

CREATE POLICY "Users can manage alternatives of their trips" ON public.trip_alternatives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_timeline_items 
      JOIN trip_days ON trip_days.id = trip_timeline_items.day_id
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_timeline_items.id = trip_alternatives.timeline_item_id AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view transfers of accessible trips" ON public.trip_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_days 
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = trip_transfers.day_id 
      AND (trips.user_id = auth.uid() OR trips.visibility = 'public' OR 
        (trips.visibility = 'followers' AND EXISTS (
          SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = trips.user_id
        ))
      )
    )
  );

CREATE POLICY "Users can manage transfers of their trips" ON public.trip_transfers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_days 
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = trip_transfers.day_id AND trips.user_id = auth.uid()
    )
  );

-- Cache tables are public (read-only for users)
CREATE POLICY "Cache is publicly readable" ON public.cache_city_catalog FOR SELECT USING (true);
CREATE POLICY "Cache is publicly readable" ON public.cache_place_details FOR SELECT USING (true);
CREATE POLICY "Cache is publicly readable" ON public.cache_routes FOR SELECT USING (true);
CREATE POLICY "Cache is publicly readable" ON public.cache_duration_estimates FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_visibility ON public.trips(visibility);
CREATE INDEX idx_trip_days_trip_id ON public.trip_days(trip_id);
CREATE INDEX idx_trip_timeline_items_day_id ON public.trip_timeline_items(day_id);
CREATE INDEX idx_trip_hotels_trip_id ON public.trip_hotels(trip_id);
CREATE INDEX idx_cache_place_details_expires ON public.cache_place_details(expires_at);
CREATE INDEX idx_cache_routes_expires ON public.cache_routes(expires_at);
CREATE INDEX idx_cache_city_catalog_expires ON public.cache_city_catalog(expires_at);
CREATE INDEX idx_cache_duration_estimates_expires ON public.cache_duration_estimates(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cache_place_details_updated_at
  BEFORE UPDATE ON public.cache_place_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();