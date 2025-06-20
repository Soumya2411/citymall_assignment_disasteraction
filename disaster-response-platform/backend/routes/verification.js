const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { mockAuth } = require('../middleware/auth');
const geminiService = require('../utils/geminiService');
const supabase = require('../config/supabase');

// Apply authentication middleware
router.use(mockAuth);

/**
 * @route   POST /api/disasters/:id/verify-image
 * @desc    Verify image authenticity for a disaster report
 * @access  Public (authenticated)
 */
router.post('/:id/verify-image', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, report_id } = req.body;
    
    if (!image_url) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'image_url is required',
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
    
    // If report_id is provided, check if it exists and belongs to the disaster
    if (report_id) {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('id, verification_status')
        .eq('id', report_id)
        .eq('disaster_id', id)
        .single();
      
      if (reportError) {
        if (reportError.message.includes('No rows found')) {
          logger.warn(`Report with ID ${report_id} not found for disaster ${id}`);
          return res.status(404).json({
            error: 'Not found',
            message: `Report not found`,
          });
        }
        
        logger.error({ error: reportError }, `Error fetching report ${report_id}`);
        return res.status(500).json({
          error: 'Database error',
          message: reportError.message,
        });
      }
    }
    
    // Verify image with Gemini API
    const verificationResult = await geminiService.verifyImage(image_url);
    
    // Update report verification status if report_id is provided
    if (report_id) {
      const verification_status = verificationResult.authentic ? 'verified' : 'rejected';
      
      const { error: updateError } = await supabase
        .from('reports')
        .update({ verification_status })
        .eq('id', report_id)
        .eq('disaster_id', id);
      
      if (updateError) {
        logger.error({ error: updateError }, `Error updating report ${report_id} verification status`);
        // Continue with response, but log the error
      } else {
        logger.info({ report_id, verification_status }, 'Report verification status updated');
      }
    }
    
    logger.info({
      disaster_id: id,
      report_id: report_id || 'N/A',
      authentic: verificationResult.authentic,
      confidence: verificationResult.confidence,
    }, 'Image verification completed');
    
    res.status(200).json({
      disaster_id: id,
      report_id: report_id || null,
      verification_result: verificationResult,
    });
  } catch (error) {
    logger.error({ error }, 'Error in POST /disasters/:id/verify-image');
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
