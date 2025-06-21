# Disaster Response Platform - Functions Documentation

This document provides comprehensive documentation for all functions, components, and services in the Disaster Response Coordination Platform.

## Table of Contents

1. [Backend Functions](#backend-functions)
   - [API Routes & Endpoints](#api-routes--endpoints)
   - [Services & Utilities](#services--utilities)
   - [Middleware](#middleware)
2. [Frontend Functions](#frontend-functions)
   - [React Components](#react-components)
   - [Pages](#pages)
   - [Services](#services)
   - [Contexts](#contexts)
3. [Helper Functions](#helper-functions)
4. [GitHub Copilot Assistance Highlights](#github-copilot-assistance-highlights)

---

## Backend Functions

### API Routes & Endpoints

#### Disasters API (`/api/disasters`)

**File: `backend/routes/disasters.js`**

- **`GET /api/disasters`** - Fetch all disasters with filtering options
  - Supports filtering by tag, owner_id, location with radius
  - Uses PostGIS for geospatial queries
  - Returns paginated results

- **`GET /api/disasters/:id`** - Get a single disaster by ID
  - Returns complete disaster information
  - Handles not found errors gracefully

- **`POST /api/disasters`** - Create a new disaster
  - Requires admin or contributor role
  - Auto-extracts location using Gemini AI if description provided
  - Geocodes location to coordinates
  - Supports tagging system

- **`PUT /api/disasters/:id`** - Update an existing disaster
  - Requires admin or contributor role
  - Only owner or admin can modify
  - Updates location coordinates if location_name changed

- **`DELETE /api/disasters/:id`** - Delete a disaster
  - Requires admin role only
  - Cascades to related records (reports, resources, etc.)

#### Geocoding API (`/api/geocode`)

**File: `backend/routes/geocode.js`**

- **`POST /api/geocode`** - Extract location from text and geocode
  - Uses Gemini AI for location extraction from natural language
  - Geocodes extracted location to coordinates
  - Implements caching for performance
  - Returns formatted geography point for PostGIS

- **`POST /api/geocode/location`** - Direct geocoding of location name
  - Bypasses AI extraction, directly geocodes provided location
  - Supports multiple geocoding services (OpenStreetMap, Google Maps, Mapbox)
  - Cached results for efficiency

#### Resources API (`/api/resources`)

**File: `backend/routes/resources.js`**

- **`GET /api/resources`** - Get all resources with filtering
  - Supports location-based filtering with radius
  - Filters by resource type, availability status
  - Returns resources with formatted location data

- **`GET /api/resources/:id`** - Get single resource details
  - Returns complete resource information including coordinates

- **`POST /api/resources`** - Create new resource
  - Requires contributor or admin role
  - Validates resource data
  - Geocodes location if provided
  - Emits real-time updates via WebSocket

- **`PUT /api/resources/:id`** - Update existing resource
  - Role-based authorization
  - Updates location coordinates if changed
  - Real-time notifications

- **`DELETE /api/resources/:id`** - Delete resource
  - Admin-only operation
  - Real-time updates to connected clients

- **`GET /api/disasters/:id/resources`** - Get resources near a disaster
  - Finds resources within specified radius of disaster location
  - Uses geospatial queries for efficiency

#### Social Media API (`/api/disasters/:id/social-media`)

**File: `backend/routes/socialMedia.js`**

- **`GET /api/disasters/:id/social-media`** - Fetch social media posts
  - Returns mock Twitter-like social media posts
  - Supports filtering by replies inclusion
  - Caches results for performance

- **`GET /api/mock-social-media`** - Generate mock social media content
  - Creates realistic social media posts based on keywords
  - Used for demonstration purposes

#### Reports API (`/api/reports`)

**File: `backend/routes/reports.js`**

- **`GET /api/reports`** - Get all incident reports
  - Supports filtering by disaster, user, status
  - Paginated results with sorting

- **`POST /api/reports`** - Create new incident report
  - Allows citizens to report incidents
  - Links to disasters or creates standalone reports
  - Includes location and media attachments

- **`PUT /api/reports/:id`** - Update report status
  - Admin/contributor can update verification status
  - Tracks status changes with timestamps

#### Verification API (`/api/verify-image`)

**File: `backend/routes/verification.js`**

- **`POST /api/verify-image`** - Verify image authenticity
  - Uses Gemini AI for image analysis
  - Detects potential deepfakes or manipulated images
  - Returns confidence scores and analysis details

- **`POST /api/disasters/:id/verify-image`** - Disaster-specific image verification
  - Links verification to specific disaster context
  - Enhanced analysis based on disaster type and location

#### Official Updates API (`/api/disasters/:id/updates`)

**File: `backend/routes/officialUpdates.js`**

- **`GET /api/disasters/:id/updates`** - Get official updates
  - Returns government and agency updates
  - Uses web scraping and Browse Page service
  - Caches updates to prevent excessive API calls

### Services & Utilities

#### Gemini AI Service

**File: `backend/utils/geminiService.js`**

- **`extractLocation(description)`** - Extract location from natural language text
  - Uses Google Gemini AI for intelligent location parsing
  - Handles various text formats and languages
  - Returns structured location data

- **`verifyImage(imageUrl)`** - AI-powered image verification
  - Analyzes images for authenticity markers
  - Detects potential manipulation or deepfakes
  - Returns detailed analysis with confidence scores

#### Geocoding Service 

**File: `backend/utils/geocodingService.js`**

- **`geocode(locationName)`** - Convert location name to coordinates
  - Supports multiple providers (OpenStreetMap, Google Maps, Mapbox)
  - Implements intelligent caching
  - Fallback mechanisms for service reliability

- **`geocodeWithOpenStreetMap(locationName)`** - Free OSM geocoding
  - Uses Nominatim API for address resolution
  - No API key required, rate-limited

- **`geocodeWithGoogleMaps(locationName)`** - Google Maps geocoding
  - High accuracy results with detailed formatting
  - Requires API key and billing setup

- **`geocodeWithMapbox(locationName)`** - Mapbox geocoding
  - Alternative paid geocoding service
  - Good international coverage

- **`toGeographyPoint(lat, lng)`** - Convert to PostGIS format
  - Creates geography points for database storage
  - Ensures proper spatial indexing

#### Cache Service

**File: `backend/utils/cacheService.js`**

- **`get(key)`** - Retrieve cached value
  - Checks expiration automatically
  - Returns null for expired or missing keys
  - Handles database errors gracefully

- **`set(key, value, ttl)`** - Store value in cache
  - Configurable TTL (time to live)
  - Uses upsert for insert/update operations
  - Stores JSONB data efficiently

- **`delete(key)`** - Remove specific cached item
  - Immediate cache invalidation
  - Error handling and logging

- **`clearExpired()`** - Clean up expired cache entries
  - Maintenance function to prevent cache bloat
  - Can be scheduled as a cron job

#### Browse Page Service

**File: `backend/utils/browsePageService.js`**

- **`scrapeWebsite(url)`** - Extract content from web pages
  - Uses Cheerio for HTML parsing
  - Handles various website structures
  - Error resilient with fallbacks

- **`getOfficialUpdates(disasterInfo)`** - Fetch official disaster updates
  - Scrapes government and emergency services websites
  - Filters relevant content based on disaster context
  - Returns structured update data

- **`getMockUpdates(website, tags)`** - Generate mock official updates
  - Creates realistic official communications
  - Used for development and testing

#### Mock Twitter Service

**File: `backend/utils/mockTwitterService.js`**

- **`generateMockTweets(keywords, count)`** - Create realistic social media posts
  - Generates contextually relevant content
  - Includes user profiles, timestamps, engagement metrics
  - Supports hashtags and mentions

- **`generateUserProfile()`** - Create mock user profiles
  - Realistic usernames, display names, profile images
  - Varied follower counts and verification status

#### Logger Service

**File: `backend/utils/logger.js`**

- **Configuration**: Uses Pino logger with pretty printing
- **Levels**: Debug, info, warn, error with environment-based filtering
- **Features**: Structured logging, colorized output, timestamp formatting

### Middleware

#### Authentication Middleware

**File: `backend/middleware/auth.js`**

- **`mockAuth(req, res, next)`** - Mock authentication system
  - Simulates user authentication for development
  - Extracts user info from mock user database
  - Sets req.user for downstream middleware

- **`authorize(roles)`** - Role-based authorization
  - Checks if user has required role (admin, contributor, user)
  - Returns 403 for unauthorized access
  - Supports multiple role requirements

---

## Frontend Functions

### React Components

#### DisasterCard Component

**File: `frontend/src/components/DisasterCard.jsx`**

- **`DisasterCard({ disaster })`** - Renders disaster information card
  - Displays disaster title, location, severity, status
  - Color-coded severity badges (high=red, medium=orange, low=yellow)
  - Formatted dates and descriptions
  - Links to detailed disaster view

- **`formatDate(dateString)`** - Format date for display
- **`getSeverityColor(level)`** - Get badge color for severity
- **`getStatusColor(status)`** - Get badge color for status

#### LocationSearchInput Component

**File: `frontend/src/components/LocationSearchInput.jsx`**

- **`LocationSearchInput(props)`** - Intelligent location search input
  - Real-time search with debouncing
  - Geocoding integration with coordinate display
  - Selection validation and error handling
  - Customizable styling and behavior

- **`handleSearch(query)`** - Execute location search
- **`handleLocationSelect(location)`** - Process location selection
- **`validateSelection()`** - Ensure valid location is selected

#### Sidebar Component

**File: `frontend/src/components/Sidebar.jsx`**

- **`Sidebar()`** - Navigation sidebar with role-based menu items
  - Dynamic menu based on user permissions
  - Active route highlighting
  - User profile display with role information

- **`MenuItem({ icon, label, to, isActive })`** - Individual menu item
  - Icon and label rendering
  - Active state styling
  - Router integration

#### Header Component

**File: `frontend/src/components/Header.jsx`**

- **`Header()`** - Application header with user menu
  - Brand title and navigation
  - User avatar and dropdown menu
  - Role-based action buttons (Create Disaster for admins/contributors)
  - Logout functionality

#### Error Components

**File: `frontend/src/components/ErrorAlert.jsx`**

- **`ErrorAlert({ title, message, onRetry })`** - Standardized error display
  - Consistent error messaging across the app
  - Optional retry functionality
  - Accessible alert styling

**File: `frontend/src/components/PageLoader.jsx`**

- **`PageLoader({ message })`** - Loading spinner component
  - Customizable loading message
  - Consistent loading states
  - Chakra UI styled spinner

### Pages

#### Dashboard Page

**File: `frontend/src/pages/Dashboard.jsx`**

- **`Dashboard({ socket })`** - Main dashboard with disaster overview
  - Real-time disaster updates via WebSocket
  - Filtering by tags and search functionality
  - Grid layout of disaster cards
  - Role-based action buttons

- **`loadDisasters()`** - Fetch and display disasters
- **`handleFilterChange(filter)`** - Apply filters to disaster list
- **`setupSocketListeners()`** - Configure real-time updates

#### DisasterDetail Page

**File: `frontend/src/pages/DisasterDetail.jsx`**

- **`DisasterDetail({ socket })`** - Detailed disaster information
  - Tabbed interface (Overview, Social Media, Resources, Updates, Reports)
  - Real-time updates for all sections
  - Edit functionality for authorized users
  - Resource and report management

- **`loadDisasterData(id)`** - Fetch complete disaster information
- **`handleEditDisaster(data)`** - Update disaster information
- **`setupRealTimeUpdates()`** - Configure WebSocket listeners
- **`handleLocationUpdate(location)`** - Process location changes

#### ResourcesMap Page

**File: `frontend/src/pages/ResourcesMap.jsx`**

- **`ResourcesMap({ socket })`** - Interactive resource mapping
  - Leaflet map integration with resource markers
  - Two view modes: All Resources vs. Near Disaster
  - Advanced filtering (type, location, availability)
  - CRUD operations for resources (based on user role)

- **`loadResources()`** - Fetch and display resources
- **`handleCreateResource(data)`** - Create new resource
- **`handleUpdateResource(id, data)`** - Update existing resource
- **`handleDeleteResource(id)`** - Remove resource
- **`validateResourceForm(data)`** - Form validation
- **`getResourceCoordinates(resource)`** - Extract coordinates for mapping

#### CreateDisaster Page

**File: `frontend/src/pages/CreateDisaster.jsx`**

- **`CreateDisaster()`** - Form for creating new disasters
  - Multi-step form with validation
  - Location search integration
  - Tag management system
  - Role-based access control

- **`handleSubmit(data)`** - Process disaster creation
- **`validateForm(data)`** - Form validation logic
- **`handleTagAdd(tag)`** - Manage disaster tags
- **`handleLocationSelection(location)`** - Process location data

#### ReportIncident Page

**File: `frontend/src/pages/ReportIncident.jsx`**

- **`ReportIncident({ socket })`** - Incident reporting form
  - Link reports to existing disasters or create standalone
  - Media upload capabilities
  - Location-based reporting
  - Status tracking

- **`handleReportSubmission(data)`** - Submit incident report
- **`linkToDisaster(disasterId)`** - Associate with existing disaster
- **`uploadMedia(files)`** - Handle media attachments

#### MyReports Page

**File: `frontend/src/pages/MyReports.jsx`**

- **`MyReports()`** - User's personal reports dashboard
  - View all reports created by current user
  - Status tracking and updates
  - Edit and update capabilities
  - Filtering and sorting options

- **`loadUserReports()`** - Fetch user's reports
- **`handleReportUpdate(id, data)`** - Update report information
- **`filterReports(criteria)`** - Apply filters to report list

#### ImageVerification Page

**File: `frontend/src/pages/ImageVerification.jsx`**

- **`ImageVerification()`** - AI-powered image verification tool
  - Upload and analyze images for authenticity
  - Display verification results with confidence scores
  - Link verification to disasters or reports
  - Historical verification tracking

- **`handleImageUpload(file)`** - Process image uploads
- **`verifyImage(imageData)`** - Submit for AI analysis
- **`displayResults(results)`** - Show verification analysis

#### Login Page

**File: `frontend/src/pages/Login.jsx`**

- **`Login()`** - Authentication interface
  - Mock user selection for development
  - Role-based authentication simulation
  - Redirect handling after login
  - User session management

- **`handleLogin(userId)`** - Process login attempt
- **`validateCredentials(data)`** - Credential validation
- **`redirectAfterLogin()`** - Handle post-login navigation

### Services

#### API Service

**File: `frontend/src/services/apiService.js`**

- **Disaster Management**:
  - `getAllDisasters(params)` - Fetch disasters with filtering
  - `getDisasterById(id)` - Get single disaster details
  - `createDisaster(data)` - Create new disaster
  - `updateDisaster(id, data)` - Update disaster information
  - `deleteDisaster(id)` - Remove disaster

- **Resource Management**:
  - `getAllResources(lat, lng, radius, type)` - Get resources with location filtering
  - `getResourceById(id)` - Get single resource details
  - `createResourceIndependent(data)` - Create standalone resource
  - `updateResourceIndependent(id, data)` - Update resource
  - `deleteResourceIndependent(id)` - Remove resource
  - `getResourcesByDisasterId(id, radius, type)` - Get resources near disaster

- **Social Media**:
  - `getSocialMediaByDisasterId(id, includeReplies)` - Get social media posts
  - `getMockSocialMedia(keywords)` - Generate mock social content

- **Reports**:
  - `getAllReports(params)` - Get all reports with filtering
  - `getReportsByDisasterId(id)` - Get disaster-specific reports
  - `createReport(data)` - Submit new report
  - `updateReport(id, data)` - Update report information

- **Verification**:
  - `verifyImage(imageData)` - Submit image for AI verification

- **Geocoding**:
  - `extractLocation(text)` - Extract location from text using AI
  - `geocodeLocation(locationName)` - Convert location name to coordinates

- **Official Updates**:
  - `getOfficialUpdates(disasterId)` - Get official disaster updates

### Contexts

#### AuthContext

**File: `frontend/src/contexts/AuthContext.jsx`**

- **`AuthProvider({ children })`** - Authentication context provider
  - Manages user authentication state
  - Provides login/logout functionality
  - Persists user session in localStorage
  - Mock user system for development

- **`login(userId)`** - Authenticate user
- **`logout()`** - Clear user session
- **`useAuth()`** - Hook to access auth context

### Helper Functions

#### Leaflet Icons Configuration

**File: `frontend/src/utils/leafletIcons.js`**

- **Icon Configuration**: Sets up custom markers for Leaflet maps
- **Default Markers**: Configures standard map pin icons
- **Custom Styling**: Provides consistent iconography across maps

---

## GitHub Copilot Assistance Highlights


### 🤖 AI-Powered Code Generation

1. **API Route Structure**: Copilot helped generate consistent REST API patterns across all route files, ensuring proper error handling, logging, and response formatting.

2. **React Component Boilerplate**: Assisted in creating standardized React functional components with proper imports, state management, and PropTypes.

### 🔧 Code Optimization & Best Practices

1. **Error Handling**: Copilot suggested comprehensive try-catch blocks and proper error response formats across all API endpoints.

2. **Input Validation**: Helped implement robust form validation both on client and server sides, including edge cases and security considerations.

### 🎨 UI/UX Enhancements

1. **Chakra UI Components**: Copilot provided suggestions for proper Chakra UI component usage, styling props, and responsive design patterns.

2. **Form Components**: Assisted in creating reusable form components with validation, error states, and accessibility features.

### 🐛 Debugging Assistance
1. **Error Diagnosis**: Copilot helped identify potential issues in async code and suggested fixes.







