const axios = require('axios');
const logger = require('./logger');
const cacheService = require('./cacheService');

// Get the configured mapping service from environment variables
const mappingService = process.env.MAPPING_SERVICE || 'openstreetmap'; // Default to OpenStreetMap (free)

/**
 * Geocoding service to convert location names to coordinates
 */
const geocodingService = {
  /**
   * Geocode a location name to coordinates
   * @param {string} locationName - Name of the location to geocode
   * @returns {Promise<object|null>} Coordinates object with lat, lng or null if not found
   */
  async geocode(locationName) {
    try {
      // Check cache first
      const cacheKey = `geocode_${mappingService}_${Buffer.from(locationName).toString('base64')}`;
      const cachedResult = await cacheService.get(cacheKey);
      
      if (cachedResult) {
        logger.info('Retrieved geocoding from cache');
        return cachedResult;
      }
      
      let coordinates;
      
      // Use the configured mapping service
      switch (mappingService.toLowerCase()) {
        case 'google':
          coordinates = await this.geocodeWithGoogleMaps(locationName);
          break;
        case 'mapbox':
          coordinates = await this.geocodeWithMapbox(locationName);
          break;
        case 'openstreetmap':
        default:
          coordinates = await this.geocodeWithOpenStreetMap(locationName);
          break;
      }
      
      if (coordinates) {
        // Cache the result
        await cacheService.set(cacheKey, coordinates);
        
        logger.info({
          location: locationName,
          coordinates,
          service: mappingService,
        }, 'Geocoded location');
      } else {
        logger.warn({ location: locationName }, 'Failed to geocode location');
      }
      
      return coordinates;
    } catch (error) {
      logger.error({ error, location: locationName }, 'Error geocoding location');
      throw new Error(`Failed to geocode location: ${error.message}`);
    }
  },

  /**
   * Geocode with OpenStreetMap's Nominatim API (free)
   * @param {string} locationName 
   * @returns {Promise<object|null>}
   */
  async geocodeWithOpenStreetMap(locationName) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: locationName,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0',
        },
      });
      
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name,
        };
      }
      
      return null;
    } catch (error) {
      logger.error({ error }, 'OpenStreetMap geocoding failed');
      return null;
    }
  },

  /**
   * Geocode with Google Maps API
   * @param {string} locationName 
   * @returns {Promise<object|null>}
   */
  async geocodeWithGoogleMaps(locationName) {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        logger.error('Missing Google Maps API key');
        return null;
      }
      
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: locationName,
          key: apiKey,
        },
      });
      
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;
        
        return {
          lat: location.lat,
          lng: location.lng,
          displayName: result.formatted_address,
        };
      }
      
      return null;
    } catch (error) {
      logger.error({ error }, 'Google Maps geocoding failed');
      return null;
    }
  },

  /**
   * Geocode with Mapbox API
   * @param {string} locationName 
   * @returns {Promise<object|null>}
   */
  async geocodeWithMapbox(locationName) {
    try {
      const apiKey = process.env.MAPBOX_API_KEY;
      
      if (!apiKey) {
        logger.error('Missing Mapbox API key');
        return null;
      }
      
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json`,
        {
          params: {
            access_token: apiKey,
            limit: 1,
          },
        }
      );
      
      if (response.data && response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const coordinates = feature.center;
        
        return {
          lng: coordinates[0],
          lat: coordinates[1],
          displayName: feature.place_name,
        };
      }
      
      return null;
    } catch (error) {
      logger.error({ error }, 'Mapbox geocoding failed');
      return null;
    }
  },

  /**
   * Convert coordinates to a PostGIS geography point
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} PostGIS geography point in WKT format
   */
  toGeographyPoint(lat, lng) {
    return `POINT(${lng} ${lat})`;
  }
};

module.exports = geocodingService;
