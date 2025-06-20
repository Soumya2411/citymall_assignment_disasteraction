const logger = require('./logger');
const cacheService = require('./cacheService');

/**
 * Mock Twitter API service for social media integration
 */
const mockTwitterService = {
  /**
   * Get mock social media posts related to a disaster
   * @param {string} disasterId - ID of the disaster
   * @param {Array<string>} tags - Tags to filter posts by
   * @param {boolean} includeReplies - Whether to include replies
   * @returns {Promise<Array>} Array of social media posts
   */
  async getPostsByDisaster(disasterId, tags = [], includeReplies = false) {
    try {
      // Generate cache key based on parameters
      const cacheKey = `mock_twitter_${disasterId}_${tags.join('_')}_${includeReplies}`;
      
      // Check cache first
      const cachedPosts = await cacheService.get(cacheKey);
      if (cachedPosts) {
        logger.info('Retrieved mock Twitter posts from cache');
        return cachedPosts;
      }
      
      // Generate mock posts
      const posts = this.generateMockPosts(disasterId, tags);
      
      // Cache the results
      await cacheService.set(cacheKey, posts);
      
      logger.info({ count: posts.length }, 'Generated mock Twitter posts');
      return posts;
    } catch (error) {
      logger.error({ error }, 'Error getting mock Twitter posts');
      throw new Error('Failed to get social media posts: ' + error.message);
    }
  },

  /**
   * Generate mock Twitter posts for a disaster
   * @param {string} disasterId - ID of the disaster
   * @param {Array<string>} tags - Tags to include in posts
   * @returns {Array} Array of mock posts
   */
  generateMockPosts(disasterId, tags = []) {
    // Use the current timestamp for realistic post times
    const now = new Date();
    
    // Sample locations for the disaster
    const locations = [
      'Lower East Side, NYC',
      'Midtown Manhattan',
      'Upper West Side',
      'Harlem',
      'Brooklyn Heights',
      'Queens',
      'Bronx',
    ];
    
    // Sample needs
    const needs = [
      'food',
      'water',
      'shelter',
      'medical supplies',
      'evacuation',
      'power generators',
      'blankets',
      'volunteers',
    ];
    
    // Sample hashtags
    const hashtags = ['#disaster', '#emergency', '#relief', '#help'];
    
    // Add the disaster tags as hashtags
    const disasterHashtags = tags.map(tag => `#${tag}`);
    
    // Generate 5-15 random posts
    const postCount = 5 + Math.floor(Math.random() * 10);
    const posts = [];
    
    for (let i = 0; i < postCount; i++) {
      // Random user ID
      const userId = `citizen${Math.floor(Math.random() * 1000)}`;
      
      // Random location
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      // Random need
      const need = needs[Math.floor(Math.random() * needs.length)];
      
      // Random hashtags (2-4)
      const postHashtags = [];
      const hashtagCount = 2 + Math.floor(Math.random() * 3);
      
      // Always include at least one disaster-specific hashtag if available
      if (disasterHashtags.length > 0) {
        postHashtags.push(disasterHashtags[Math.floor(Math.random() * disasterHashtags.length)]);
      }
      
      // Add random general hashtags
      while (postHashtags.length < hashtagCount) {
        const randomTag = hashtags[Math.floor(Math.random() * hashtags.length)];
        if (!postHashtags.includes(randomTag)) {
          postHashtags.push(randomTag);
        }
      }
      
      // Random timestamp within the last 24 hours
      const timestamp = new Date(now.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000));
      
      // Randomly mark some posts as urgent (about 20%)
      const isUrgent = Math.random() < 0.2;
      
      // Create the post content
      let content = '';
      
      if (isUrgent) {
        content += 'URGENT: ';
      }
      
      content += `Need ${need} in ${location}. `;
      
      // Add a more detailed description sometimes
      if (Math.random() < 0.7) {
        const details = [
          `Situation is ${isUrgent ? 'critical' : 'manageable'}.`,
          `${Math.floor(Math.random() * 50) + 5} people affected.`,
          `Local resources are ${Math.random() < 0.5 ? 'depleted' : 'limited'}.`,
          `Access is ${Math.random() < 0.3 ? 'restricted' : 'difficult but possible'}.`,
        ];
        
        content += details[Math.floor(Math.random() * details.length)] + ' ';
      }
      
      // Add hashtags
      content += postHashtags.join(' ');
      
      // Create the post object
      const post = {
        id: `mock_${disasterId}_${i}`,
        user: {
          id: userId,
          username: `user_${userId}`,
        },
        content,
        timestamp: timestamp.toISOString(),
        location,
        isUrgent,
        disaster_id: disasterId,
      };
      
      posts.push(post);
    }
    
    // Sort by timestamp (newest first)
    return posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
};

module.exports = mockTwitterService;
