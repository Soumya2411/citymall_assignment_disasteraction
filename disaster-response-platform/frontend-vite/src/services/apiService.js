import axios from 'axios';

// Set base URL from environment variable or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include user ID in headers
api.interceptors.request.use(
  (config) => {
    const userData = localStorage.getItem('disaster_response_user');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        config.headers['X-User-ID'] = user.id;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // Disaster endpoints
  getAllDisasters: async () => {
    const response = await api.get('/disasters');
    return response.data;
  },
  
  getDisasters: async (params) => {
    const response = await api.get('/disasters', { params });
    return response.data;
  },
  
  getDisasterById: async (id) => {
    const response = await api.get(`/disasters/${id}`);
    return response.data;
  },
  
  getDisastersByOwner: async (ownerId) => {
    const response = await api.get('/disasters', { params: { owner_id: ownerId } });
    return response.data;
  },
  
  getDisastersByTag: async (tag) => {
    const response = await api.get('/disasters', { params: { tag } });
    return response.data;
  },
  
  createDisaster: async (disasterData) => {
    const response = await api.post('/disasters', disasterData);
    return response.data;
  },
  
  updateDisaster: async (id, disasterData) => {
    const response = await api.put(`/disasters/${id}`, disasterData);
    return response.data;
  },
  
  deleteDisaster: async (id) => {
    const response = await api.delete(`/disasters/${id}`);
    return response.data;
  },
    // Social media endpoints
  getSocialMediaByDisasterId: async (disasterId, includeReplies = false) => {
    const response = await api.get(`/disasters/${disasterId}/social-media`, {
      params: { include_replies: includeReplies },
    });
    return response.data;
  },
  
  getMockSocialMedia: async (keywords) => {
    const response = await api.get('/mock-social-media', {
      params: { keywords },
    });
    return response.data;
  },    // Resources endpoints (independent)
  getAllResources: async (lat, lng, radius, type) => {
    const params = {};
    if (lat !== undefined && lng !== undefined) {
      params.lat = lat;
      params.lng = lng;
    }
    if (radius) {
      params.radius = radius;
    }
    if (type) {
      params.type = type;
    }
    
    const response = await api.get('/resources', { params });
    return response.data;
  },
  
  getResourceById: async (id) => {
    const response = await api.get(`/resources/${id}`);
    return response.data;
  },
  
  createResourceIndependent: async (resourceData) => {
    const response = await api.post('/resources', resourceData);
    return response.data;
  },
  
  updateResourceIndependent: async (id, resourceData) => {
    const response = await api.put(`/resources/${id}`, resourceData);
    return response.data;
  },
  
  deleteResourceIndependent: async (id) => {
    const response = await api.delete(`/resources/${id}`);
    return response.data;
  },
  
  // Resources endpoints (disaster-specific - for finding resources near disasters)
  getResourcesByDisasterId: async (disasterId, radius, type) => {
    const params = {};
    if (radius) {
      params.radius = radius;
    }
    if (type) {
      params.type = type;
    }
    
    const response = await api.get(`/disasters/${disasterId}/resources`, { params });
    return response.data;
  },
    // Legacy resource endpoints (for backward compatibility)
  createResource: async (resourceData) => {
    // Use independent resource creation instead
    const { disaster_id: _disasterId, ...independentData } = resourceData;
    return await apiService.createResourceIndependent(independentData);
  },
  
  updateResource: async (resourceData) => {
    // Use independent resource update instead
    const { disaster_id: _disasterId, ...independentData } = resourceData;
    return await apiService.updateResourceIndependent(resourceData.id, independentData);
  },
  
  deleteResource: async (resourceId) => {
    // Use independent resource deletion instead
    return await apiService.deleteResourceIndependent(resourceId);
  },
    // Official updates endpoints
  getOfficialUpdatesByDisasterId: async (disasterId) => {
    const response = await api.get(`/disasters/${disasterId}/official-updates`);
    return response.data;
  },
    // Verification endpoints
  verifyImage: async (imageData) => {
    const url = imageData.disaster_id 
      ? `/disasters/${imageData.disaster_id}/verify-image` 
      : '/verify-image';
    
    const response = await api.post(url, { image_url: imageData.image_url });
    return response.data;
  },
    // Geocoding endpoints
  extractLocation: async (text) => {
    const response = await api.post('/geocode', { text });
    return response.data;
  },
  
  geocodeLocation: async (locationName) => {
    const response = await api.post('/geocode/location', { location_name: locationName });
    return response.data;
  },
    // Reports endpoints
  getAllReports: async (params) => {
    const response = await api.get('/reports', { params });
    return response.data;
  },
  
  getReportsByDisasterId: async (disasterId) => {
    const response = await api.get('/reports', { params: { disaster_id: disasterId } });
    return response.data;
  },
  
  getReportsByUser: async (userId) => {
    const response = await api.get('/reports', { params: { user_id: userId } });
    return response.data;
  },
  
  getReportById: async (id) => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
  
  createReport: async (reportData) => {
    const response = await api.post('/reports', reportData);
    return response.data;
  },
  
  updateReport: async (id, reportData) => {
    const response = await api.put(`/reports/${id}`, reportData);
    return response.data;
  },
  
  deleteReport: async (id) => {
    const response = await api.delete(`/reports/${id}`);
    return response.data;
  },
  
  updateReportVerification: async (disasterId, reportId, verificationStatus) => {
    const response = await api.put(`/reports/${reportId}`, {
      verification_status: verificationStatus,
    });
    return response.data;
  },
};

export default apiService;
