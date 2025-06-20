-- Enable PostGIS extension for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Disasters table
CREATE TABLE IF NOT EXISTS disasters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location GEOGRAPHY(POINT),
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  audit_trail JSONB DEFAULT '[]'
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disaster_id UUID NOT NULL REFERENCES disasters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources table (independent resources like shelters, hospitals, etc.)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location GEOGRAPHY(POINT),
  type TEXT NOT NULL,
  description TEXT,
  availability_status TEXT DEFAULT 'available',
  contact_info TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache table for API responses
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create geospatial index on disasters location column
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);

-- Create geospatial index on resources location column
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);

-- Create index on disasters tags (using GIN for array search)
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);

-- Create index on disasters owner_id
CREATE INDEX IF NOT EXISTS disasters_owner_id_idx ON disasters (owner_id);

-- Create index on reports disaster_id
CREATE INDEX IF NOT EXISTS reports_disaster_id_idx ON reports (disaster_id);

-- Create index on reports verification_status
CREATE INDEX IF NOT EXISTS reports_verification_status_idx ON reports (verification_status);

-- Create index on resources type
CREATE INDEX IF NOT EXISTS resources_type_idx ON resources (type);

-- Create index on cache expires_at for efficient cleanup
CREATE INDEX IF NOT EXISTS cache_expires_at_idx ON cache (expires_at);

-- Create or replace stored procedure to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache() RETURNS void AS $$
BEGIN
  DELETE FROM cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
