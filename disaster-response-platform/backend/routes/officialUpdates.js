const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { mockAuth } = require('../middleware/auth');
const browsePageService = require('../utils/browsePageService');
const supabase = require('../config/supabase');

// Apply authentication middleware
router.use(mockAuth);

/**
 * @route   GET /api/disasters/:id/official-updates
 * @desc    Get official updates for a disaster
 * @access  Public (authenticated)
 */
router.get('/:id/official-updates', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('tags')
      .eq('id', id)
      .single();
    
    if (disasterError) {
      if (disasterError.message.includes('No rows found')) {
        logger.warn(`Disaster with ID ${id} not found`);
        return res.status(404).json({
          error: 'Not found',
          message: `Disaster with ID ${id} not found`,
        });
      }
      
      logger.error({ error: disasterError }, `Error fetching disaster with ID ${id}`);
      return res.status(500).json({
        error: 'Database error',
        message: disasterError.message,
      });
    }
    
    // Get official updates from Browse Page service
    const updates = await browsePageService.getOfficialUpdates(id, disaster.tags);
    
    logger.info({ count: updates.length }, `Official updates fetched for disaster ${id}`);
    res.status(200).json(updates);
  } catch (error) {
    logger.error({ error }, 'Error in GET /disasters/:id/official-updates');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
