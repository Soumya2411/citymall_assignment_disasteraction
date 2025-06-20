-- Function to get resources near a specific point (for Supabase RPC calls)
CREATE OR REPLACE FUNCTION get_resources_near_point(
  center_lng DOUBLE PRECISION,
  center_lat DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 10000,
  resource_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location_name TEXT,
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  type TEXT,
  description TEXT,
  availability_status TEXT,
  contact_info TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.location_name,
    ST_AsText(r.location) as location_text,
    ST_Y(r.location::geometry) as latitude,
    ST_X(r.location::geometry) as longitude,
    r.type,
    r.description,
    r.availability_status,
    r.contact_info,
    r.capacity,
    r.created_at
  FROM resources r
  WHERE (resource_type IS NULL OR r.type = resource_type)
    AND ST_DWithin(
      r.location,
      ST_SetSRID(ST_Point(center_lng, center_lat), 4326)::geography,
      radius_meters
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get disaster coordinates
CREATE OR REPLACE FUNCTION get_disaster_coordinates(disaster_id UUID)
RETURNS TABLE (
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_X(location::geometry) as longitude,
    ST_Y(location::geometry) as latitude
  FROM disasters 
  WHERE id = disaster_id;
END;
$$ LANGUAGE plpgsql;

-- Function to extract coordinates from a geography point
CREATE OR REPLACE FUNCTION get_coordinates(geog GEOGRAPHY)
RETURNS TABLE (
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_X(geog::geometry) as longitude,
    ST_Y(geog::geometry) as latitude;
END;
$$ LANGUAGE plpgsql;

-- Function to get resources with location as text for easier frontend consumption (updated for independent resources)
CREATE OR REPLACE FUNCTION get_resources_with_text_location(
  p_resource_type TEXT DEFAULT NULL,
  p_center_lat DOUBLE PRECISION DEFAULT NULL,
  p_center_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_meters DOUBLE PRECISION DEFAULT 10000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location_name TEXT,
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  type TEXT,
  description TEXT,
  availability_status TEXT,
  contact_info TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.location_name,
    ST_AsText(r.location) as location_text,
    ST_Y(r.location::geometry) as latitude,
    ST_X(r.location::geometry) as longitude,
    r.type,
    r.description,
    r.availability_status,
    r.contact_info,
    r.capacity,
    r.created_at
  FROM resources r
  WHERE (p_resource_type IS NULL OR r.type = p_resource_type)
    AND (
      p_center_lat IS NULL OR p_center_lng IS NULL OR
      ST_DWithin(
        r.location,
        ST_Point(p_center_lng, p_center_lat)::geography,
        p_radius_meters
      )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get a single resource with location as text (updated for independent resources)
CREATE OR REPLACE FUNCTION get_resource_with_text_location(p_resource_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location_name TEXT,
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  type TEXT,
  description TEXT,
  availability_status TEXT,
  contact_info TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.location_name,
    ST_AsText(r.location) as location_text,
    ST_Y(r.location::geometry) as latitude,
    ST_X(r.location::geometry) as longitude,
    r.type,
    r.description,
    r.availability_status,
    r.contact_info,
    r.capacity,
    r.created_at
  FROM resources r
  WHERE r.id = p_resource_id;
END;
$$ LANGUAGE plpgsql;
