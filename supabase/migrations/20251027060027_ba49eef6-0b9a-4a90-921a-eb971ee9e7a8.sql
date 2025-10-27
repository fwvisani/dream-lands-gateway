-- Add orchestrator fields to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS notices text[],
ADD COLUMN IF NOT EXISTS sources jsonb DEFAULT '{"maps_calls": 0, "gpt_calls": 0, "matrix_calls": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS debug jsonb DEFAULT '{"cache_hits": 0, "version": 1}'::jsonb;

-- Update cache_routes to add time_bucket field (already exists, just ensure it's there)
-- Already exists from previous work

-- Add version field to all cache tables for cache busting
ALTER TABLE cache_city_catalog ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE cache_place_details ADD COLUMN IF NOT EXISTS sources jsonb DEFAULT '{}'::jsonb;

-- Create cache_itinerary_assembly table for block caching
CREATE TABLE IF NOT EXISTS cache_itinerary_assembly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL,
  city text NOT NULL,
  profile_key text NOT NULL,
  season text NOT NULL,
  assembly_data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(cache_key, version)
);

-- Enable RLS on cache_itinerary_assembly
ALTER TABLE cache_itinerary_assembly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assembly cache is publicly readable"
ON cache_itinerary_assembly FOR SELECT
USING (true);

-- Add trip limits tracking table
CREATE TABLE IF NOT EXISTS user_trip_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trips_created integer NOT NULL DEFAULT 0,
  pack_tier text NOT NULL DEFAULT 'free',
  pack_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_trip_limits
ALTER TABLE user_trip_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own limits"
ON user_trip_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits"
ON user_trip_limits FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger to auto-create limits record
CREATE OR REPLACE FUNCTION create_user_limits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_trip_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_limits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_limits();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_assembly_key ON cache_itinerary_assembly(cache_key, version);
CREATE INDEX IF NOT EXISTS idx_cache_assembly_expires ON cache_itinerary_assembly(expires_at);
CREATE INDEX IF NOT EXISTS idx_trips_run_id ON trips(run_id);
CREATE INDEX IF NOT EXISTS idx_trips_visibility_status ON trips(visibility, status);