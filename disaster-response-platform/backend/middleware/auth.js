const logger = require('../utils/logger');

// Mock users with roles
const mockUsers = {
  'netrunnerX': { role: 'admin' },
  'reliefAdmin': { role: 'admin' },
  'contributor1': { role: 'contributor' },
  'contributor2': { role: 'contributor' },
  'citizen1': { role: 'user' },
  'citizen2': { role: 'user' },
};

/**
 * Mock authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const mockAuth = (req, res, next) => {
  // Get user ID from header or query parameter
  const userId = req.headers['x-user-id'] || req.query.user_id;
  
  if (!userId) {
    logger.warn('Authentication failed: No user ID provided');
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a user ID in the X-User-ID header or user_id query parameter',
    });
  }
  
  const user = mockUsers[userId];
  
  if (!user) {
    logger.warn(`Authentication failed: Unknown user ID: ${userId}`);
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Unknown user ID',
    });
  }
  
  // Attach user to request object
  req.user = {
    id: userId,
    role: user.role,
  };
  
  logger.info(`User authenticated: ${userId} (${user.role})`);
  next();
};

/**
 * Role-based authorization middleware
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // Make sure user is authenticated
    if (!req.user) {
      logger.warn('Authorization failed: User not authenticated');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first',
      });
    }
    
    // Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.id} with role ${req.user.role} not authorized`);
      return res.status(403).json({
        error: 'Not authorized',
        message: 'You do not have permission to access this resource',
      });
    }
    
    logger.info(`User authorized: ${req.user.id} (${req.user.role})`);
    next();
  };
};

module.exports = {
  mockAuth,
  authorize,
  mockUsers,
};
