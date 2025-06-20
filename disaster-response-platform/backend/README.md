# Disaster Response Platform - Backend

A backend API for a disaster response coordination platform that aggregates real-time data to aid disaster management.

## Features

- Disaster data management with CRUD operations
- Location extraction using Google Gemini API
- Geocoding using OpenStreetMap (free) or optional Google Maps/Mapbox
- Mock Twitter API for social media reports
- Geospatial resource mapping using Supabase PostgreSQL
- Official updates aggregation using Browse Page
- Image verification using Google Gemini API
- Real-time updates via WebSockets (Socket.IO)

## Tech Stack

- Node.js
- Express.js
- Supabase (PostgreSQL)
- Socket.IO
- Google Gemini API
- OpenStreetMap Nominatim API (free geocoding)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key

   # Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key

   # Mapping Service (Choose one to use)
   # OpenStreetMap is free and doesn't require an API key
   MAPPING_SERVICE=openstreetmap
   # MAPPING_SERVICE=google
   # GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   # MAPPING_SERVICE=mapbox
   # MAPBOX_API_KEY=your_mapbox_api_key

   # Server Config
   PORT=5000
   NODE_ENV=development

   # Cache TTL (in seconds)
   CACHE_TTL=3600
   ```
4. Set up Supabase:
   - Create a free Supabase project at [https://supabase.com](https://supabase.com)
   - Run the SQL scripts in the `/db` folder to create tables and sample data

5. Start the server:
   ```
   npm start
   ```
   For development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

### Disasters
- `GET /api/disasters` - Get all disasters with optional filtering
- `GET /api/disasters/:id` - Get a single disaster
- `POST /api/disasters` - Create a new disaster
- `PUT /api/disasters/:id` - Update a disaster
- `DELETE /api/disasters/:id` - Delete a disaster

### Social Media
- `GET /api/disasters/:id/social-media` - Get social media posts for a disaster
- `GET /api/mock-social-media` - Mock endpoint for social media posts

### Resources
- `GET /api/disasters/:id/resources` - Get resources for a disaster
- `POST /api/disasters/:id/resources` - Create a resource
- `PUT /api/disasters/:disasterId/resources/:resourceId` - Update a resource
- `DELETE /api/disasters/:disasterId/resources/:resourceId` - Delete a resource

### Official Updates
- `GET /api/disasters/:id/official-updates` - Get official updates

### Verification
- `POST /api/disasters/:id/verify-image` - Verify image authenticity

### Geocoding
- `POST /api/geocode` - Extract and geocode a location from text
- `POST /api/geocode/location` - Geocode a specific location

### Reports
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get a single report
- `POST /api/reports` - Create a report
- `PUT /api/reports/:id` - Update a report
- `DELETE /api/reports/:id` - Delete a report

## Authentication

For demonstration purposes, this API uses mock authentication. Include the user ID in the request headers:

```
X-User-ID: netrunnerX
```

Available mock users:
- `netrunnerX` (admin)
- `reliefAdmin` (admin)
- `contributor1` (contributor)
- `contributor2` (contributor)
- `citizen1` (user)
- `citizen2` (user)

## WebSockets

Connect to the WebSocket server to receive real-time updates:

```javascript
const socket = io('http://localhost:5000');

socket.on('disaster_updated', (data) => {
  console.log('Disaster updated:', data);
});

socket.on('social_media_updated', (data) => {
  console.log('Social media updated:', data);
});

socket.on('resources_updated', (data) => {
  console.log('Resources updated:', data);
});
```
