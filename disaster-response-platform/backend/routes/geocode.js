const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { mockAuth } = require('../middleware/auth');
const geminiService = require('../utils/geminiService');
const geocodingService = require('../utils/geocodingService');
const cacheService = require('../utils/cacheService');

// Apply authentication middleware
router.use(mockAuth);

/**
 * @route   POST /api/geocode
 * @desc    Extract location from text and geocode it
 * @access  Public (authenticated)
 */
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'Text is required',
      });
    }
    
    // Generate cache key based on text
    const cacheKey = `geocode_full_${Buffer.from(text).toString('base64')}`;
    
    // Check cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      logger.info('Retrieved geocoding result from cache');
      return res.status(200).json(cachedResult);
    }
    
    // Extract location from text using Gemini API
    let locationName;
    try {
      locationName = await geminiService.extractLocation(text);
      
      if (!locationName) {
        return res.status(400).json({
          error: 'Location extraction failed',
          message: 'Could not extract a location from the provided text',
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error extracting location with Gemini API');
      return res.status(500).json({
        error: 'Location extraction error',
        message: error.message,
      });
    }
    
    // Geocode the extracted location
    let coordinates;
    try {
      coordinates = await geocodingService.geocode(locationName);
      
      if (!coordinates) {
        return res.status(400).json({
          error: 'Geocoding failed',
          message: `Could not geocode location: ${locationName}`,
        });
      }
    } catch (error) {
      logger.error({ error }, `Error geocoding location: ${locationName}`);
      return res.status(500).json({
        error: 'Geocoding error',
        message: error.message,
      });
    }
    
    // Create the response
    const result = {
      extracted_location: locationName,
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
      display_name: coordinates.displayName,
      geography_point: geocodingService.toGeographyPoint(coordinates.lat, coordinates.lng),
    };
    
    // Cache the result
    await cacheService.set(cacheKey, result);
    
    logger.info({
      location: locationName,
      coordinates: { lat: coordinates.lat, lng: coordinates.lng },
    }, 'Location extracted and geocoded successfully');
    
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error in POST /geocode');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/geocode/location
 * @desc    Geocode a specific location name
 * @access  Public (authenticated)
 */
router.post('/location', async (req, res) => {
  try {
    const { location_name } = req.body;
    
    if (!location_name) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'location_name is required',
      });
    }
    
    // Geocode the location
    let coordinates;
    try {
      coordinates = await geocodingService.geocode(location_name);
      
      if (!coordinates) {
        return res.status(400).json({
          error: 'Geocoding failed',
          message: `Could not geocode location: ${location_name}`,
        });
      }
    } catch (error) {
      logger.error({ error }, `Error geocoding location: ${location_name}`);
      return res.status(500).json({
        error: 'Geocoding error',
        message: error.message,
      });
    }
    
    // Create the response
    const result = {
      location_name,
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
      display_name: coordinates.displayName,
      geography_point: geocodingService.toGeographyPoint(coordinates.lat, coordinates.lng),
    };
    
    logger.info({
      location: location_name,
      coordinates: { lat: coordinates.lat, lng: coordinates.lng },
    }, 'Location geocoded successfully');
    
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error in POST /geocode/location');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
