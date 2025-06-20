const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { mockAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');

// Apply authentication middleware
router.use(mockAuth);

/**
 * @route   GET /api/reports
 * @desc    Get all reports with optional filtering
 * @access  Public (authenticated)
 */
router.get('/', async (req, res) => {
  try {
    const { disaster_id, user_id, verification_status } = req.query;
    
    // Start building the query
    let query = supabase.from('reports').select('*');
    
    // Apply filters if provided
    if (disaster_id) {
      query = query.eq('disaster_id', disaster_id);
    }
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    
    if (verification_status) {
      query = query.eq('verification_status', verification_status);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      logger.error({ error }, 'Error fetching reports');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ count: data.length }, 'Reports fetched successfully');
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in GET /reports');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/:id
 * @desc    Get a single report by ID
 * @access  Public (authenticated)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.message.includes('No rows found')) {
        logger.warn(`Report with ID ${id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Report with ID ${id} not found`,
        });
      }
      
      logger.error({ error }, `Error fetching report with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info(`Report with ID ${id} fetched successfully`);
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in GET /reports/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/reports
 * @desc    Create a new report
 * @access  Public (authenticated)
 */
router.post('/', async (req, res) => {
  try {
    // All authenticated users can create incident reports
    const { disaster_id, content, image_url } = req.body;
    
    // Validate required fields
    if (!disaster_id || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'disaster_id and content are required',
      });
    }
    
    // Check if disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('id')
      .eq('id', disaster_id)
      .single();
    
    if (disasterError) {
      if (disasterError.message.includes('No rows found')) {
        logger.warn(`Disaster with ID ${disaster_id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Disaster with ID ${disaster_id} not found`,
        });
      }
      
      logger.error({ error: disasterError }, `Error fetching disaster with ID ${disaster_id}`);
      return res.status(500).json({
        error: 'Database error',
        message: disasterError.message,
      });
    }
    
    // Insert the report into the database
    const { data, error } = await supabase
      .from('reports')
      .insert({
        disaster_id,
        user_id: req.user.id,
        content,
        image_url: image_url || null,
        verification_status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      logger.error({ error }, 'Error creating report');
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ report: data }, 'Report created successfully');
    res.status(201).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in POST /reports');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/reports/:id
 * @desc    Update a report
 * @access  Owner, Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, image_url, verification_status } = req.body;
    
    // First, fetch the current report to check ownership
    const { data: existingReport, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.message.includes('No rows found')) {
        logger.warn(`Report with ID ${id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Report with ID ${id} not found`,
        });
      }
      
      logger.error({ error: fetchError }, `Error fetching report with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: fetchError.message,
      });
    }
    
    // Check ownership or admin role
    if (existingReport.user_id !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`User ${req.user.id} not authorized to update report ${id}`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'You do not have permission to update this report',
      });
    }
      // Prepare update object
    const updateData = {};
    if (content) updateData.content = content;
    if (image_url !== undefined) updateData.image_url = image_url;
      // Only admins and contributors can update verification status
    if (verification_status && (req.user.role === 'admin' || req.user.role === 'contributor')) {
      updateData.verification_status = verification_status;
    } else if (verification_status) {
      // If user tries to update verification status without permission
      logger.warn(`User ${req.user.id} with role ${req.user.role} not authorized to update verification status`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Only contributors and administrators can update verification status',
      });
    }
    
    // Update the report
    const { data, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error({ error }, `Error updating report with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info({ report: data }, `Report with ID ${id} updated successfully`);
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, 'Error in PUT /reports/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete a report
 * @access  Owner, Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, fetch the current report to check ownership
    const { data: existingReport, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.message.includes('No rows found')) {
        logger.warn(`Report with ID ${id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Report with ID ${id} not found`,
        });
      }
      
      logger.error({ error: fetchError }, `Error fetching report with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: fetchError.message,
      });
    }
    
    // Check ownership or admin role
    if (existingReport.user_id !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`User ${req.user.id} not authorized to delete report ${id}`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'You do not have permission to delete this report',
      });
    }
    
    // Delete the report
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error({ error }, `Error deleting report with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }
    
    logger.info(`Report with ID ${id} deleted successfully`);
    res.status(200).json({
      message: `Report with ID ${id} deleted successfully`,
    });
  } catch (error) {
    logger.error({ error }, 'Error in DELETE /reports/:id');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
