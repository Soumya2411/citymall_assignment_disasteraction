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
 * @desc    Get resources near a specific disaster location
 * @access  Public (authenticated)
 * @param   {string} id - Disaster ID
 * @param   {number} radius - Optional radius in kilometers for geospatial filtering (default: 10)
 * @param   {string} type - Optional resource type filter
 */
router.get('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const { radius = 10, type } = req.query;
    
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
 * @route   GET /api/resources
 * @desc    Get all resources with optional geospatial filtering
 * @access  Public (authenticated)
 * @param   {string} lat - Optional latitude for geospatial filtering
 * @param   {string} lng - Optional longitude for geospatial filtering
 * @param   {number} radius - Optional radius in kilometers for geospatial filtering (default: 10)
 * @param   {string} type - Optional resource type filter
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 10, type } = req.query;
    
    // Apply geospatial filtering if lat and lng are provided
    if (lat && lng) {
      try {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
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
          logger.error({ error }, 'Error fetching resources near location using RPC');
          return res.status(500).json({
            error: 'Database error',
            message: error.message,
          });
        }
        
        logger.info({ count: data.length, lat, lng, radius }, 'Resources fetched successfully with location filter');
        return res.status(200).json(data);
      } catch (error) {
        logger.error({ error }, 'Invalid location format for geospatial query');
        return res.status(400).json({
          error: 'Invalid location format',
          message: 'Location should be in format lat,lng and radius should be a number in kilometers',
        });
      }
    }
      // If no location filtering, get all resources with type filter only
    const { data, error } = await supabase
      .rpc('get_resources_with_text_location', {
        p_resource_type: type || null,
        p_center_lat: null,
        p_center_lng: null,
        p_radius_meters: null
      });
    
    if (error) {
      logger.error({ error }, 'Error fetching resources');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ count: data.length, type, radius }, 'All resources fetched successfully');
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in GET /resources');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/resources
 * @desc    Create a new resource (independent of disasters)
 * @access  Contributors and Admins only
 */
router.post('/', async (req, res) => {
  try {
    // Check if user has permission to create resources (contributors and admins only)
    if (req.user.role !== 'admin' && req.user.role !== 'contributor') {
      logger.warn(`User ${req.user.id} with role ${req.user.role} not authorized to create resources`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Only contributors and administrators can create resources',
      });
    }

    const { 
      name, 
      location_name, 
      type, 
      description, 
      availability_status, 
      contact_info, 
      capacity 
    } = req.body;
    
    // Validate required fields
    if (!name || !location_name || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, location_name, and type are required',
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
      name,
      location_name,
      type,
      location: `POINT(${coordinates.lng} ${coordinates.lat})`,
    };
    
    // Add optional fields if provided
    if (description) resourceData.description = description;
    if (availability_status) resourceData.availability_status = availability_status;
    if (contact_info) resourceData.contact_info = contact_info;
    if (capacity !== undefined) resourceData.capacity = capacity;
    
    const { data, error } = await supabase
      .from('resources')
      .insert(resourceData)
      .select('id')
      .single();
    
    if (error) {
      logger.error({ error }, 'Error creating resource');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    // Fetch the created resource with properly formatted location data
    const { data: resourceWithLocation, error: fetchError } = await supabase
      .rpc('get_resource_with_text_location', {
        p_resource_id: data.id
      });
    
    if (fetchError || !resourceWithLocation || resourceWithLocation.length === 0) {
      logger.error({ error: fetchError }, 'Error fetching created resource');
      return res.status(500).json({
        error: 'Database error',
        message: 'Resource created but could not fetch details',
      });
    }
    
    const createdResource = resourceWithLocation[0];
    
    // Emit socket event for real-time updates
    req.io.emit('resources_updated', {
      action: 'create',
      resource: createdResource,
    });
    
    logger.info({
      resourceId: createdResource.id,
      name,
      location: location_name,
    }, 'Resource created successfully');
    
    res.status(201).json(createdResource);
  } catch (error) {
    logger.error({ error }, 'Error in POST /resources');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/resources/:id
 * @desc    Get a specific resource by ID
 * @access  Public (authenticated)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .rpc('get_resource_with_text_location', {
        p_resource_id: id
      });
    
    if (error) {
      if (error.message.includes('No rows found') || !data || data.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: `Resource with ID ${id} not found`,
        });
      }
      
      logger.error({ error }, 'Error fetching resource');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ resourceId: id }, 'Resource fetched successfully');
    res.status(200).json(data[0]); // Return the first (and only) result
  } catch (error) {
    logger.error({ error }, 'Error in GET /resources/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/resources/:id
 * @desc    Update a resource
 * @access  Contributors and Admins only
 */
router.put('/:id', async (req, res) => {
  try {
    // Check if user has permission to update resources (contributors and admins only)
    if (req.user.role !== 'admin' && req.user.role !== 'contributor') {
      logger.warn(`User ${req.user.id} with role ${req.user.role} not authorized to update resources`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Only contributors and administrators can update resources',
      });
    }

    const { id } = req.params;
    const { 
      name, 
      location_name, 
      type, 
      description, 
      availability_status, 
      contact_info, 
      capacity 
    } = req.body;
    
    // Check if resource exists
    const { data: existingResource, error: resourceError } = await supabase
      .from('resources')
      .select('id')
      .eq('id', id)
      .single();
    
    if (resourceError) {
      if (resourceError.message.includes('No rows found')) {
        return res.status(404).json({
          error: 'Not found',
          message: `Resource with ID ${id} not found`,
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
    if (description !== undefined) updateData.description = description;
    if (availability_status) updateData.availability_status = availability_status;
    if (contact_info !== undefined) updateData.contact_info = contact_info;
    if (capacity !== undefined) updateData.capacity = capacity;
    
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
      .eq('id', id)
      .select('id')
      .single();
    
    if (error) {
      logger.error({ error }, 'Error updating resource');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    // Fetch the updated resource with properly formatted location data
    const { data: updatedResourceWithLocation, error: fetchError } = await supabase
      .rpc('get_resource_with_text_location', {
        p_resource_id: id
      });
    
    if (fetchError || !updatedResourceWithLocation || updatedResourceWithLocation.length === 0) {
      logger.error({ error: fetchError }, 'Error fetching updated resource');
      return res.status(500).json({
        error: 'Database error',
        message: 'Resource updated but could not fetch details',
      });
    }
    
    const updatedResource = updatedResourceWithLocation[0];
    
    // Emit socket event for real-time updates
    req.io.emit('resources_updated', {
      action: 'update',
      resource: updatedResource,
    });
    
    logger.info({ resourceId: id }, 'Resource updated successfully');
    res.status(200).json(updatedResource);
  } catch (error) {
    logger.error({ error }, 'Error in PUT /resources/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/resources/:id
 * @desc    Delete a resource
 * @access  Admins only
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if user has permission to delete resources (admins only)
    if (req.user.role !== 'admin') {
      logger.warn(`User ${req.user.id} with role ${req.user.role} not authorized to delete resources`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Only administrators can delete resources',
      });
    }

    const { id } = req.params;
    
    // Check if resource exists
    const { data: existingResource, error: resourceError } = await supabase
      .from('resources')
      .select('id')
      .eq('id', id)
      .single();
    
    if (resourceError) {
      if (resourceError.message.includes('No rows found')) {
        return res.status(404).json({
          error: 'Not found',
          message: `Resource with ID ${id} not found`,
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
      .eq('id', id);
    
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
      resource_id: id,
    });
    
    logger.info({ resourceId: id }, 'Resource deleted successfully');
    res.status(200).json({
      message: 'Resource deleted successfully',
      id: id,
    });
  } catch (error) {
    logger.error({ error }, 'Error in DELETE /resources/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

// ============================================================================
// DISASTER-SPECIFIC RESOURCE ROUTES (for finding resources near disasters)
// ============================================================================

module.exports = router;