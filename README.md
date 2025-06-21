# Disaster Response Coordination Platform

A comprehensive platform for coordinating disaster response efforts with real-time collaboration, AI-powered features, and geospatial resource mapping.

## 🌐 Live Demo

- **Frontend**: [https://disasteractions.vercel.app/](https://disasteractions.vercel.app/)
- **Backend API**: [https://soumya.outlfy.com](https://soumya.outlfy.com)

> **Note**: While the assignment suggested using Render for deployment, I used my own VPC infrastructure to ensure optimal performance and avoid the typical 1-minute cold start delays that examiners would experience with free-tier services.

## 🚀 Features

- **Real-time Disaster Management** - Create, update, and track disasters with live updates
- **AI-Powered Location Extraction** - Uses Google Gemini AI to extract locations from natural language
- **Image Verification** - AI-based image authenticity verification to combat misinformation
- **Interactive Resource Mapping** - Geospatial mapping of emergency resources with Leaflet
- **Social Media Integration** - Mock social media feed simulation for disaster-related posts
- **Role-based Access Control** - Admin, Contributor, and User roles with different permissions
- **Official Updates Aggregation** - Web scraping for government and agency updates
- **Incident Reporting** - Citizens can report incidents with location and media attachments
- **Real-time Collaboration** - WebSocket-powered live updates across all features

## 🛠 Tech Stack

### Frontend
- **React 19** with Vite
- **Chakra UI** for component library
- **React Router** for navigation
- **Leaflet** for interactive maps
- **Socket.IO Client** for real-time updates
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **Supabase** (PostgreSQL) with PostGIS for geospatial data
- **Socket.IO** for real-time WebSocket connections
- **Google Gemini AI** for location extraction and image verification
- **Multiple Geocoding Services** (OpenStreetMap, Google Maps, Mapbox)
- **Pino Logger** for structured logging
- **Express Rate Limiting** for API protection

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Google Gemini API key (optional, for AI features)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd disaster-response-platform/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   # Database
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   
   # AI Services
   GEMINI_API_KEY=your_gemini_api_key
   
   # Geocoding (optional - defaults to free OpenStreetMap)
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   MAPBOX_API_KEY=your_mapbox_key
   MAPPING_SERVICE=openstreetmap
   
   # Cache
   CACHE_TTL=3600
   
   # Server
   PORT=5000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Run the database setup script
   # For Windows PowerShell:
   .\setup-db.ps1
   
   # For Unix/Linux/macOS:
   chmod +x setup-db.sh
   ./setup-db.sh
   ```

5. **Start the backend server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start the frontend development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🗄 Database Schema

The platform uses PostgreSQL with PostGIS extension for geospatial features:

- **disasters** - Main disaster records with location data
- **resources** - Emergency resources with geospatial coordinates
- **reports** - Incident reports from citizens
- **social_media** - Social media posts and updates
- **official_updates** - Government and agency communications
- **cache** - Application-level caching for performance

## 🔧 API Endpoints

### Core APIs
- `GET /api/disasters` - List all disasters with filtering
- `POST /api/disasters` - Create new disaster (Admin/Contributor)
- `GET /api/resources` - Get resources with location filtering
- `POST /api/geocode` - AI-powered location extraction
- `POST /api/verify-image` - Image authenticity verification

### Real-time Features
- WebSocket connection on `/socket.io`
- Live updates for disasters, resources, reports, and social media

## 👥 User Roles

### Admin
- Full access to all features
- Can delete disasters and resources
- Manage user permissions

### Contributor
- Create and edit disasters
- Manage resources
- Verify reports and images

### User (Citizen)
- Report incidents
- View disasters and resources
- Access public information

## 🧪 Development Features

- **Mock Authentication** - Quick user switching for testing different roles
- **Mock Social Media** - Simulated Twitter-like social media feeds
- **Sample Data** - Pre-populated data for testing and demonstration

## 🚀 Deployment

### Frontend (Vercel)
The frontend is deployed on Vercel with automatic deployments from the main branch.

### Backend (Custom VPC)
The backend is deployed on a custom VPC infrastructure for optimal performance:
- **Domain**: soumya.outlfy.com
- **SSL/TLS**: Automatic HTTPS encryption
- **Load Balancing**: High availability setup
- **Monitoring**: Real-time performance monitoring

## 📱 Usage

1. **Login**: Select a user role from the login page
2. **Dashboard**: View all active disasters and recent updates
3. **Create Disaster**: Admin/Contributors can create new disaster entries
4. **Resources Map**: Interactive map showing emergency resources
5. **Report Incident**: Citizens can report new incidents
6. **Image Verification**: Upload images for AI authenticity analysis

## 🔍 Key Features in Detail

### AI-Powered Location Extraction
Uses Google Gemini AI to parse natural language descriptions and extract precise location information.

### Geospatial Resource Discovery
Advanced PostGIS queries to find resources within specified distances from disaster locations.

### Real-time Collaboration
WebSocket-based updates ensure all users see changes immediately without page refreshes.

### Multi-Service Geocoding
Fallback system using OpenStreetMap (free), Google Maps, or Mapbox for reliable location services.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with assistance from GitHub Copilot for enhanced development productivity
- Uses Supabase for robust database and real-time features
- Powered by Google Gemini AI for intelligent text and image processing
- Map data provided by OpenStreetMap contributors

---

For detailed function documentation, see [FUNCTIONS_DOCUMENTATION.md](./FUNCTIONS_DOCUMENTATION.md)
