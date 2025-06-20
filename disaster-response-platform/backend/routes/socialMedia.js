const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { mockAuth } = require('../middleware/auth');
const mockTwitterService = require('../utils/mockTwitterService');
const supabase = require('../config/supabase');

// Apply authentication middleware
router.use(mockAuth);

/**
 * @route   GET /api/disasters/:id/social-media
 * @desc    Get social media posts for a disaster
 * @access  Public (authenticated)
 */
router.get('/:id/social-media', async (req, res) => {
  try {
    const { id } = req.params;
    const { include_replies } = req.query;
    
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
    
    // Get social media posts from mock Twitter API
    const posts = await mockTwitterService.getPostsByDisaster(
      id,
      disaster.tags,
      include_replies === 'true'
    );
    
    // Emit socket event for real-time updates
    req.io.emit('social_media_updated', {
      disaster_id: id,
      count: posts.length,
    });
    
    logger.info({ count: posts.length }, `Social media posts fetched for disaster ${id}`);
    res.status(200).json(posts);
  } catch (error) {
    logger.error({ error }, 'Error in GET /disasters/:id/social-media');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/mock-social-media
 * @desc    Mock endpoint for social media posts
 * @access  Public (authenticated)
 */
router.get('/mock-social-media', async (req, res) => {
  try {
    const { disaster_id, tags } = req.query;
    
    if (!disaster_id) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'disaster_id is required',
      });
    }
    
    // Parse tags if provided
    const parsedTags = tags ? tags.split(',') : [];
    
    // Generate mock posts
    const posts = mockTwitterService.generateMockPosts(disaster_id, parsedTags);
    
    logger.info({ count: posts.length }, 'Mock social media posts generated');
    res.status(200).json(posts);
  } catch (error) {
    logger.error({ error }, 'Error in GET /mock-social-media');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
