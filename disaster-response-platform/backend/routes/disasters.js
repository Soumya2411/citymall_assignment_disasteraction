const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { mockAuth, authorize } = require('../middleware/auth');
const geminiService = require('../utils/geminiService');
const geocodingService = require('../utils/geocodingService');

// Apply authentication middleware to all routes
router.use(mockAuth);

/**
 * @route   GET /api/disasters
 * @desc    Get all disasters with optional filtering
 * @access  Public (authenticated)
 */
router.get('/', async (req, res) => {
  try {
    const { tag, owner_id, location, radius } = req.query;
    
    // Start building the query
    let query = supabase.from('disasters').select('*');
    
    // Apply filters if provided
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    
    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }
    
    // Handle geospatial filtering if location and radius are provided
    if (location && radius) {
      try {
        const [lat, lng] = location.split(',').map(parseFloat);
        const radiusMeters = parseFloat(radius) * 1000; // Convert km to meters
        
        // Use PostGIS ST_DWithin for efficient geospatial query
        query = query.filter(
          'location',
          'st_dwithin',
          `POINT(${lng} ${lat})::geography`,
          radiusMeters
        );
      } catch (error) {
        logger.error({ error }, 'Invalid location format for geospatial query');
        return res.status(400).json({
          error: 'Invalid location format',
          message: 'Location should be in format "lat,lng" and radius should be a number in kilometers',
        });
      }
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      logger.error({ error }, 'Error fetching disasters');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ count: data.length }, 'Disasters fetched successfully');
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in GET /disasters');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/disasters/:id
 * @desc    Get a single disaster by ID
 * @access  Public (authenticated)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.message.includes('No rows found')) {
        logger.warn(`Disaster with ID ${id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Disaster with ID ${id} not found`,
        });
      }
      
      logger.error({ error }, `Error fetching disaster with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info(`Disaster with ID ${id} fetched successfully`);
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in GET /disasters/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/disasters
 * @desc    Create a new disaster
 * @access  Admin, Contributor
 */
router.post('/', authorize(['admin', 'contributor']), async (req, res) => {
  try {
    const { title, location_name, description, tags } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and description are required',
      });
    }
    
    // Get location name from description if not provided
    let finalLocationName = location_name;
    if (!finalLocationName) {
      try {
        finalLocationName = await geminiService.extractLocation(description);
        if (!finalLocationName) {
          return res.status(400).json({
            error: 'Location extraction failed',
            message: 'Could not extract location from description. Please provide a location_name.',
          });
        }
      } catch (error) {
        logger.error({ error }, 'Error extracting location with Gemini API');
        return res.status(500).json({
          error: 'Location extraction error',
          message: error.message,
        });
      }
    }
    
    // Geocode the location
    let coordinates;
    try {
      coordinates = await geocodingService.geocode(finalLocationName);
      if (!coordinates) {
        return res.status(400).json({
          error: 'Geocoding failed',
          message: `Could not geocode location: ${finalLocationName}`,
        });
      }
    } catch (error) {
      logger.error({ error }, `Error geocoding location: ${finalLocationName}`);
      return res.status(500).json({
        error: 'Geocoding error',
        message: error.message,
      });
    }
    
    // Convert coordinates to PostGIS geography point
    const geographyPoint = geocodingService.toGeographyPoint(coordinates.lat, coordinates.lng);
    
    // Create audit trail entry
    const auditTrail = [{
      action: 'create',
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
    }];
    
    // Insert the disaster into the database
    const { data, error } = await supabase
      .from('disasters')
      .insert({
        title,
        location_name: finalLocationName,
        location: geographyPoint,
        description,
        tags: tags || [],
        owner_id: req.user.id,
        audit_trail: auditTrail,
      })
      .select()
      .single();
    
    if (error) {
      logger.error({ error }, 'Error creating disaster');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ disaster: data }, 'Disaster created successfully');
    
    // Emit socket event for real-time updates
    req.io.emit('disaster_updated', {
      action: 'create',
      disaster: data,
    });
    
    res.status(201).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in POST /disasters');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/disasters/:id
 * @desc    Update a disaster
 * @access  Admin, Owner
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location_name, description, tags } = req.body;
    
    // First, fetch the current disaster to check ownership and get current data
    const { data: existingDisaster, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.message.includes('No rows found')) {
        logger.warn(`Disaster with ID ${id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Disaster with ID ${id} not found`,
        });
      }
      
      logger.error({ error: fetchError }, `Error fetching disaster with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: fetchError.message,
      });
    }
    
    // Check ownership or admin role
    if (existingDisaster.owner_id !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`User ${req.user.id} not authorized to update disaster ${id}`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'You do not have permission to update this disaster',
      });
    }
    
    // Prepare update object
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (tags) updateData.tags = tags;
    
    // Handle location update if provided
    if (location_name && location_name !== existingDisaster.location_name) {
      updateData.location_name = location_name;
      
      // Geocode the new location
      try {
        const coordinates = await geocodingService.geocode(location_name);
        if (coordinates) {
          updateData.location = geocodingService.toGeographyPoint(coordinates.lat, coordinates.lng);
        } else {
          logger.warn(`Could not geocode location: ${location_name}`);
          // Continue with update but don't update coordinates
        }
      } catch (error) {
        logger.error({ error }, `Error geocoding location: ${location_name}`);
        // Continue with update but don't update coordinates
      }
    }
    
    // Update audit trail
    const auditTrail = existingDisaster.audit_trail || [];
    auditTrail.push({
      action: 'update',
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
    });
    updateData.audit_trail = auditTrail;
    
    // Update the disaster
    const { data, error } = await supabase
      .from('disasters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error({ error }, `Error updating disaster with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ disaster: data }, `Disaster with ID ${id} updated successfully`);
    
    // Emit socket event for real-time updates
    req.io.emit('disaster_updated', {
      action: 'update',
      disaster: data,
    });
    
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in PUT /disasters/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/disasters/:id
 * @desc    Delete a disaster
 * @access  Admin, Owner
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, fetch the current disaster to check ownership
    const { data: existingDisaster, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.message.includes('No rows found')) {
        logger.warn(`Disaster with ID ${id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Disaster with ID ${id} not found`,
        });
      }
      
      logger.error({ error: fetchError }, `Error fetching disaster with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: fetchError.message,
      });
    }
    
    // Check ownership or admin role
    if (existingDisaster.owner_id !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`User ${req.user.id} not authorized to delete disaster ${id}`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'You do not have permission to delete this disaster',
      });
    }
    
    // Delete the disaster
    const { error } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error({ error }, `Error deleting disaster with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info(`Disaster with ID ${id} deleted successfully`);
    
    // Emit socket event for real-time updates
    req.io.emit('disaster_updated', {
      action: 'delete',
      disaster: { id },
    });
    
    res.status(200).json({
      message: `Disaster with ID ${id} deleted successfully`,
    });
  } catch (error) {
    logger.error({ error }, 'Error in DELETE /disasters/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
