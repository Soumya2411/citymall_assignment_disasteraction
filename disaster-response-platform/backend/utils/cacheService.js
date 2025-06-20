const supabase = require('../config/supabase');
const logger = require('./logger');

// Cache TTL in seconds, defaults to 1 hour
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL || 3600, 10);

/**
 * Cache service to store and retrieve data from Supabase cache table
 */
const cacheService = {
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<object|null>} Cached value or null if not found/expired
   */
  async get(key) {
    try {
      const now = new Date();
      
      const { data, error } = await supabase
        .from('cache')
        .select('value')
        .eq('key', key)
        .gt('expires_at', now.toISOString())
        .single();
      
      if (error) {
        // If it's not a "no rows" error, log it
        if (!error.message.includes('No rows found')) {
          logger.error({ error }, `Error fetching from cache for key: ${key}`);
        }
        return null;
      }
      
      logger.debug({ key }, 'Cache hit');
      return data.value;
    } catch (error) {
      logger.error({ error }, `Cache get error for key: ${key}`);
      return null;
    }
  },

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {object} value - Value to cache (will be stored as JSONB)
   * @param {number} [ttl=DEFAULT_TTL] - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);
      
      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from('cache')
        .upsert({
          key,
          value,
          expires_at: expiresAt.toISOString(),
        })
        .select();
      
      if (error) {
        logger.error({ error }, `Error setting cache for key: ${key}`);
        return false;
      }
      
      logger.debug({ key, ttl }, 'Cache set');
      return true;
    } catch (error) {
      logger.error({ error }, `Cache set error for key: ${key}`);
      return false;
    }
  },

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      const { error } = await supabase
        .from('cache')
        .delete()
        .eq('key', key);
      
      if (error) {
        logger.error({ error }, `Error deleting cache for key: ${key}`);
        return false;
      }
      
      logger.debug({ key }, 'Cache deleted');
      return true;
    } catch (error) {
      logger.error({ error }, `Cache delete error for key: ${key}`);
      return false;
    }
  },

  /**
   * Clear expired cache entries
   * @returns {Promise<boolean>} Success status
   */
  async clearExpired() {
    try {
      const now = new Date();
      
      const { error } = await supabase
        .from('cache')
        .delete()
        .lt('expires_at', now.toISOString());
      
      if (error) {
        logger.error({ error }, 'Error clearing expired cache entries');
        return false;
      }
      
      logger.debug('Expired cache entries cleared');
      return true;
    } catch (error) {
      logger.error({ error }, 'Error clearing expired cache');
      return false;
    }
  }
};

module.exports = cacheService;
