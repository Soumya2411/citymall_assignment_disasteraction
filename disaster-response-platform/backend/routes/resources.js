const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { mockAuth, authorize } = require('../middleware/auth');
const geocodingService = require('../utils/geocodingService');

// Apply authentication middleware to all routes
router.use(mockAuth);

/**
 * @route   GET /api/disasters/:id/resources
 * @desc    Get resources for a specific disaster with optional geospatial filtering
 * @access  Public (authenticated)
 * @param   {string} id - Disaster ID
 * @param   {string} lat - Optional latitude for geospatial filtering
 * @param   {string} lng - Optional longitude for geospatial filtering
 * @param   {number} radius - Optional radius in kilometers for geospatial filtering (default: 10)
 */
router.get('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, radius = 10, type } = req.query;
      // Get disaster location using SQL to extract coordinates directly
    const { data: coordinatesArray, error: disasterError } = await supabase
      .rpc('get_disaster_coordinates', { disaster_id: id });
    
    if (disasterError) {
      logger.error({ error: disasterError }, 'Error getting disaster coordinates');
      return res.status(500).json({
        error: 'Database error',
        message: disasterError.message,
      });
    }
    
    if (!coordinatesArray || coordinatesArray.length === 0) {
      logger.warn(`Disaster with ID ${id} not found or has no location`);
      return res.status(404).json({
        error: 'Not found',
        message: `Disaster with ID ${id} not found or has no location`,
      });
    }
    
    const coordinates = coordinatesArray[0];
    if (!coordinates.longitude || !coordinates.latitude) {
      logger.error('Disaster location coordinates are null');
      return res.status(400).json({
        error: 'Location error',
        message: 'Disaster does not have valid location coordinates',
      });
    }
    
    const { longitude, latitude } = coordinates;
    
    // Start building the query to find resources near the disaster
    let query = supabase.from('resources').select('*');
      // Filter by resource type if provided
    if (type) {
      query = query.eq('type', type);
    }
    
    // Apply geospatial filtering using disaster's location with RPC function
    try {
      const radiusMeters = parseFloat(radius) * 1000; // Convert km to meters
      
      // Use Supabase RPC function for geospatial query instead of raw PostGIS
      const { data, error } = await supabase
        .rpc('get_resources_near_point', {
          center_lng: longitude,
          center_lat: latitude,
          radius_meters: radiusMeters,
          resource_type: type || null
        });
      
      if (error) {
        logger.error({ error }, 'Error fetching resources near disaster using RPC');
        return res.status(500).json({
          error: 'Database error',
          message: error.message,
        });
      }
      
      logger.info({ 
        disasterId: id, 
        count: data.length, 
        radius: radius,
        disasterLat: latitude,
        disasterLng: longitude
      }, 'Resources near disaster fetched successfully');
      
      res.status(200).json(data);
    } catch (error) {
      logger.error({ error }, 'Invalid radius format for geospatial query');
      return res.status(400).json({
        error: 'Invalid radius format',
        message: 'Radius should be a number in kilometers',
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error in GET /disasters/:id/resources');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/disasters/:id/resources
 * @desc    Create a new resource for a specific disaster
 * @access  Public (authenticated)
 */
router.post('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location_name, type } = req.body;
    
    // Validate required fields
    if (!name || !location_name || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, location_name, and type are required',
      });
    }
    
    // Check if disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('id')
      .eq('id', id)
      .single();
    
    if (disasterError) {
      if (disasterError.message.includes('No rows found')) {
        return res.status(404).json({
          error: 'Not found',
          message: `Disaster with ID ${id} not found`,
        });
      }
      
      logger.error({ error: disasterError }, 'Error checking disaster existence');
      return res.status(500).json({
        error: 'Database error',
        message: disasterError.message,
      });
    }
    
    // Geocode the location name to get coordinates
    let coordinates;
    try {
      coordinates = await geocodingService.geocode(location_name);
    } catch (error) {
      logger.error({ error }, 'Error geocoding location');
      return res.status(500).json({
        error: 'Geocoding error',
        message: error.message,
      });
    }
    
    if (!coordinates) {
      return res.status(400).json({
        error: 'Invalid location',
        message: `Could not geocode location: ${location_name}`,
      });
    }
    
    // Create the resource with geometry
    const resourceData = {
      disaster_id: id,
      name,
      location_name,
      type,
      location: `POINT(${coordinates.lng} ${coordinates.lat})`,
    };
    
    const { data, error } = await supabase
      .from('resources')
      .insert(resourceData)
      .select()
      .single();
    
    if (error) {
      logger.error({ error }, 'Error creating resource');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    // Emit socket event for real-time updates
    req.io.emit('resources_updated', {
      action: 'create',
      disaster_id: id,
      resource: data,
    });
    
    logger.info({
      resourceId: data.id,
      disasterId: id,
      name,
      location: location_name,
    }, 'Resource created successfully');
    
    res.status(201).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in POST /disasters/:id/resources');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/disasters/:id/resources/:resourceId
 * @desc    Update a resource
 * @access  Public (authenticated)
 */
router.put('/:id/resources/:resourceId', async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const { name, location_name, type } = req.body;
    
    // Check if resource exists and belongs to the disaster
    const { data: existingResource, error: resourceError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .eq('disaster_id', id)
      .single();
    
    if (resourceError) {
      if (resourceError.message.includes('No rows found')) {
        return res.status(404).json({
          error: 'Not found',
          message: `Resource with ID ${resourceId} not found for disaster ${id}`,
        });
      }
      
      logger.error({ error: resourceError }, 'Error checking resource existence');
      return res.status(500).json({
        error: 'Database error',
        message: resourceError.message,
      });
    }
    
    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    
    // If location changed, geocode the new location
    if (location_name && location_name !== existingResource.location_name) {
      updateData.location_name = location_name;
      
      // Geocode the location name to get coordinates
      try {
        const coordinates = await geocodingService.geocode(location_name);
        if (coordinates) {
          updateData.location = `POINT(${coordinates.lng} ${coordinates.lat})`;
        } else {
          return res.status(400).json({
            error: 'Invalid location',
            message: `Could not geocode location: ${location_name}`,
          });
        }
      } catch (error) {
        logger.error({ error }, 'Error geocoding location');
        return res.status(500).json({
          error: 'Geocoding error',
          message: error.message,
        });
      }
    }
    
    // Update the resource
    const { data, error } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', resourceId)
      .select()
      .single();
    
    if (error) {
      logger.error({ error }, 'Error updating resource');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    // Emit socket event for real-time updates
    req.io.emit('resources_updated', {
      action: 'update',
      disaster_id: id,
      resource: data,
    });
    
    logger.info({
      resourceId,
      disasterId: id,
    }, 'Resource updated successfully');
    
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in PUT /disasters/:id/resources/:resourceId');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/disasters/:id/resources/:resourceId
 * @desc    Delete a resource
 * @access  Public (authenticated)
 */
router.delete('/:id/resources/:resourceId', async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    
    // Check if resource exists and belongs to the disaster
    const { data: existingResource, error: resourceError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .eq('disaster_id', id)
      .single();
    
    if (resourceError) {
      if (resourceError.message.includes('No rows found')) {
        return res.status(404).json({
          error: 'Not found',
          message: `Resource with ID ${resourceId} not found for disaster ${id}`,
        });
      }
      
      logger.error({ error: resourceError }, 'Error checking resource existence');
      return res.status(500).json({
        error: 'Database error',
        message: resourceError.message,
      });
    }
    
    // Delete the resource
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);
    
    if (error) {
      logger.error({ error }, 'Error deleting resource');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    // Emit socket event for real-time updates
    req.io.emit('resources_updated', {
      action: 'delete',
      disaster_id: id,
      resource_id: resourceId,
    });
    
    logger.info({
      resourceId,
      disasterId: id,
    }, 'Resource deleted successfully');
    
    res.status(200).json({
      message: 'Resource deleted successfully',
      id: resourceId,
    });
  } catch (error) {
    logger.error({ error }, 'Error in DELETE /disasters/:id/resources/:resourceId');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
