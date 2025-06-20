-- Sample data for testing

-- Sample disasters
INSERT INTO disasters (title, location_name, location, description, tags, owner_id, audit_trail)
VALUES
  (
    'NYC Flood',
    'Manhattan, NYC',
    ST_SetSRID(ST_Point(-74.0060, 40.7128), 4326)::geography,
    'Heavy flooding in Manhattan',
    ARRAY['flood', 'urgent'],
    'netrunnerX',
    '[{"action": "create", "user_id": "netrunnerX", "timestamp": "2025-06-17T17:16:00Z"}]'
  ),
  (
    'California Wildfire',
    'Los Angeles, CA',
    ST_SetSRID(ST_Point(-118.2437, 34.0522), 4326)::geography,
    'Wildfire spreading rapidly in Los Angeles area',
    ARRAY['fire', 'wildfire', 'urgent'],
    'reliefAdmin',
    '[{"action": "create", "user_id": "reliefAdmin", "timestamp": "2025-06-18T09:30:00Z"}]'
  ),
  (
    'Miami Hurricane',
    'Miami, FL',
    ST_SetSRID(ST_Point(-80.1918, 25.7617), 4326)::geography,
    'Hurricane approaching Miami coastline',
    ARRAY['hurricane', 'storm'],
    'contributor1',
    '[{"action": "create", "user_id": "contributor1", "timestamp": "2025-06-19T11:45:00Z"}]'
  );

-- Sample reports
INSERT INTO reports (disaster_id, user_id, content, image_url, verification_status, created_at)
VALUES
  (
    (SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1),
    'citizen1',
    'Need food in Lower East Side',
    'http://example.com/flood.jpg',
    'pending',
    NOW() - INTERVAL '2 hours'
  ),
  (
    (SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1),
    'citizen2',
    'Water level rising near 42nd St',
    'http://example.com/flood2.jpg',
    'verified',
    NOW() - INTERVAL '1 hour'
  ),
  (
    (SELECT id FROM disasters WHERE title = 'California Wildfire' LIMIT 1),
    'citizen1',
    'Smoke is very thick in downtown LA',
    'http://example.com/fire.jpg',
    'pending',
    NOW() - INTERVAL '3 hours'
  ),
  (
    (SELECT id FROM disasters WHERE title = 'Miami Hurricane' LIMIT 1),
    'citizen2',
    'Strong winds have knocked down power lines',
    'http://example.com/hurricane.jpg',
    'verified',
    NOW() - INTERVAL '30 minutes'
  );

-- Sample resources (independent of disasters)
INSERT INTO resources (name, location_name, location, type, description, availability_status, contact_info, capacity)
VALUES
  (
    'Red Cross Shelter - Lower East Side',
    'Lower East Side, NYC',
    ST_SetSRID(ST_Point(-73.9862, 40.7128), 4326)::geography,
    'shelter',
    'Emergency shelter with capacity for 200 people. Provides food, water, and basic medical care.',
    'available',
    '{"phone": "555-0101", "email": "shelter@redcross.org"}',
    200
  ),
  (
    'Emergency Medical Station - Midtown',
    'Midtown Manhattan, NYC',
    ST_SetSRID(ST_Point(-73.9851, 40.7589), 4326)::geography,
    'medical',
    'Mobile medical unit with emergency care capabilities.',
    'available',
    '{"phone": "555-0102", "email": "medical@nycdoh.gov"}',
    50
  ),
  (
    'Evacuation Center - Downtown LA',
    'Downtown LA',
    ST_SetSRID(ST_Point(-118.2427, 34.0500), 4326)::geography,
    'shelter',
    'Large evacuation center with facilities for families and pets.',
    'available',
    '{"phone": "555-0103", "email": "evacuation@lacounty.gov"}',
    500
  ),
  (
    'Water Distribution Point - Santa Monica',
    'Santa Monica, CA',
    ST_SetSRID(ST_Point(-118.4912, 34.0195), 4326)::geography,
    'supplies',
    'Water and basic supplies distribution point. Open 24/7 during emergencies.',
    'available',
    '{"phone": "555-0104"}',
    1000
  ),
  (
    'FEMA Response Center - Miami',
    'Downtown Miami, FL',
    ST_SetSRID(ST_Point(-80.1918, 25.7718), 4326)::geography,
    'command',
    'Federal emergency management coordination center.',
    'available',
    '{"phone": "555-0105", "email": "response@fema.gov"}',
    100
  ),
  (
    'Community Center Shelter - Brooklyn',
    'Brooklyn, NYC',
    ST_SetSRID(ST_Point(-73.9442, 40.6782), 4326)::geography,
    'shelter',
    'Community center converted to emergency shelter.',
    'limited',
    '{"phone": "555-0106"}',
    150
  ),
  (
    'Mobile Food Bank - Bronx',
    'Bronx, NYC',
    ST_SetSRID(ST_Point(-73.8648, 40.8448), 4326)::geography,
    'supplies',
    'Mobile food distribution unit serving emergency meals.',
    'available',
    '{"phone": "555-0107", "email": "food@foodbank.org"}',
    300
  ),
  (
    'Emergency Supply Depot - San Diego',
    'San Diego, CA',
    ST_SetSRID(ST_Point(-117.1611, 32.7157), 4326)::geography,
    'supplies',
    'Large warehouse with emergency supplies and equipment.',
    'available',
    '{"phone": "555-0108", "email": "supplies@sandiego.gov"}',
    2000
  ),
  (
    'Temporary Medical Clinic - Orlando',
    'Orlando, FL',
    ST_SetSRID(ST_Point(-81.3792, 28.5383), 4326)::geography,
    'medical',
    'Temporary medical clinic with basic healthcare services.',
    'available',
    '{"phone": "555-0109", "email": "clinic@health.fl.gov"}',
    75
  ),
  (
    'Emergency Communications Hub - Houston',
    'Houston, TX',
    ST_SetSRID(ST_Point(-95.3698, 29.7604), 4326)::geography,
    'command',
    'Emergency communications and coordination center.',
    'available',
    '{"phone": "555-0110", "email": "comms@harris.tx.gov"}',
    50
  );

-- Sample cache entries
INSERT INTO cache (key, value, expires_at)
VALUES
  (
    'geocode_openstreetmap_TWFuaGF0dGFuLCBOWUM=',
    '{"lat": 40.7128, "lng": -74.0060, "displayName": "Manhattan, New York City, New York, USA"}',
    NOW() + INTERVAL '1 hour'
  ),
  (
    'gemini_location_SGVhdnkgZmxvb2RpbmcgaW4gTWFuaGF0dGFu',
    '"Manhattan, NYC"',
    NOW() + INTERVAL '1 hour'
  );
