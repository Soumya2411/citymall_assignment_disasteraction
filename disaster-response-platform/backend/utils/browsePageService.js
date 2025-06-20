const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');
const cacheService = require('./cacheService');

/**
 * Service for scraping official updates from government websites
 */
const browsePageService = {
  /**
   * Fetch official updates related to disasters
   * @param {string} disasterId - ID of the disaster to fetch updates for
   * @param {Array<string>} tags - Disaster tags to filter updates by
   * @returns {Promise<Array>} Array of updates from official sources
   */
  async getOfficialUpdates(disasterId, tags = []) {
    try {
      // Generate cache key based on parameters
      const cacheKey = `official_updates_${disasterId}_${tags.join('_')}`;
      
      // Check cache first
      const cachedUpdates = await cacheService.get(cacheKey);
      if (cachedUpdates) {
        logger.info('Retrieved official updates from cache');
        return cachedUpdates;
      }
      
      // List of official websites to scrape based on disaster tags
      const websites = this.getWebsitesByTags(tags);
      
      // Fetch and process updates from each website
      const updatePromises = websites.map(website => this.scrapeWebsite(website, tags));
      const updatesArrays = await Promise.all(updatePromises);
      
      // Flatten array of arrays and add disaster ID
      const updates = updatesArrays
        .flat()
        .map(update => ({
          ...update,
          disaster_id: disasterId,
        }));
      
      // Cache the results
      await cacheService.set(cacheKey, updates);
      
      logger.info({ count: updates.length }, 'Fetched official updates');
      return updates;
    } catch (error) {
      logger.error({ error }, 'Error fetching official updates');
      throw new Error('Failed to fetch official updates: ' + error.message);
    }
  },

  /**
   * Get list of official websites based on disaster tags
   * @param {Array<string>} tags - Disaster tags
   * @returns {Array<Object>} Array of website objects
   */
  getWebsitesByTags(tags = []) {
    // Default websites to check
    const defaultWebsites = [
      {
        name: 'FEMA',
        url: 'https://www.fema.gov/disaster/updates',
        selector: '.views-row',
        titleSelector: 'h2',
        contentSelector: '.field-content',
        dateSelector: '.datetime',
      },
      {
        name: 'Red Cross',
        url: 'https://www.redcross.org/about-us/news-and-events/news.html',
        selector: '.news-listing__item',
        titleSelector: '.news-listing__headline',
        contentSelector: '.news-listing__description',
        dateSelector: '.news-listing__date',
      },
    ];
    
    // Add specialized websites based on tags
    const tagSpecificWebsites = [];
    
    // Convert tags to lowercase for case-insensitive matching
    const lowercaseTags = tags.map(tag => tag.toLowerCase());
    
    // Flooding-specific websites
    if (lowercaseTags.some(tag => ['flood', 'flooding'].includes(tag))) {
      tagSpecificWebsites.push({
        name: 'National Weather Service Floods',
        url: 'https://www.weather.gov/safety/flood',
        selector: '.panel',
        titleSelector: 'h3',
        contentSelector: 'p',
        dateSelector: '.date',
      });
    }
    
    // Hurricane-specific websites
    if (lowercaseTags.some(tag => ['hurricane', 'cyclone', 'storm'].includes(tag))) {
      tagSpecificWebsites.push({
        name: 'National Hurricane Center',
        url: 'https://www.nhc.noaa.gov/',
        selector: '.accordion-item',
        titleSelector: 'h3',
        contentSelector: '.body',
        dateSelector: '.date',
      });
    }
    
    // Earthquake-specific websites
    if (lowercaseTags.some(tag => ['earthquake', 'seismic'].includes(tag))) {
      tagSpecificWebsites.push({
        name: 'USGS Earthquakes',
        url: 'https://www.usgs.gov/news/news-releases',
        selector: '.field-items',
        titleSelector: 'h3',
        contentSelector: '.field-content',
        dateSelector: '.date-display-single',
      });
    }
    
    // Combine default and tag-specific websites
    return [...defaultWebsites, ...tagSpecificWebsites];
  },

  /**
   * Scrape updates from a website
   * @param {Object} website - Website configuration
   * @param {Array<string>} tags - Disaster tags to filter content by
   * @returns {Promise<Array>} Array of updates from the website
   */
  async scrapeWebsite(website, tags = []) {
    try {
      // Since we're running in a test/demo environment, we'll mock the scraping
      // rather than actually scraping external websites
      return this.getMockUpdates(website, tags);
      
      /* In a real implementation, we would do actual web scraping:
      
      const response = await axios.get(website.url, {
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0',
        },
        timeout: 10000, // 10 second timeout
      });
      
      const $ = cheerio.load(response.data);
      const updates = [];
      
      $(website.selector).each((i, element) => {
        const title = $(element).find(website.titleSelector).text().trim();
        const content = $(element).find(website.contentSelector).text().trim();
        const dateText = $(element).find(website.dateSelector).text().trim();
        
        // Only include updates related to the disaster tags
        if (this.isRelevantToTags(title + ' ' + content, tags)) {
          updates.push({
            source: website.name,
            title,
            content,
            url: website.url,
            published_at: this.parseDate(dateText),
            fetched_at: new Date().toISOString(),
          });
        }
      });
      
      return updates;
      */
    } catch (error) {
      logger.error({ error, website: website.name }, 'Error scraping website');
      return []; // Return empty array on error to prevent entire process from failing
    }
  },

  /**
   * Check if content is relevant to the given tags
   * @param {string} content - Content to check
   * @param {Array<string>} tags - Tags to check against
   * @returns {boolean} True if relevant, false otherwise
   */
  isRelevantToTags(content, tags = []) {
    if (tags.length === 0) {
      return true; // No tags to filter by, so include everything
    }
    
    // Convert content and tags to lowercase for case-insensitive matching
    const lowercaseContent = content.toLowerCase();
    const lowercaseTags = tags.map(tag => tag.toLowerCase());
    
    // Check if content contains any of the tags
    return lowercaseTags.some(tag => lowercaseContent.includes(tag));
  },

  /**
   * Parse date string into ISO format
   * @param {string} dateText - Date text to parse
   * @returns {string} ISO date string
   */
  parseDate(dateText) {
    try {
      const date = new Date(dateText);
      return date.toISOString();
    } catch (error) {
      return new Date().toISOString(); // Default to current date on error
    }
  },

  /**
   * Get mock updates for a website
   * @param {Object} website - Website configuration
   * @param {Array<string>} tags - Disaster tags
   * @returns {Array} Array of mock updates
   */
  getMockUpdates(website, tags = []) {
    const now = new Date();
    const updates = [];
    
    // Generate 2-5 mock updates
    const updateCount = 2 + Math.floor(Math.random() * 4);
    
    // Sample titles and content based on common disaster types
    const sampleUpdates = {
      flood: [
        {
          title: 'Flood Warning Issued for Lower Manhattan',
          content: 'The National Weather Service has issued a flood warning for Lower Manhattan due to heavy rainfall. Residents are advised to move to higher ground and avoid flood waters.'
        },
        {
          title: 'Emergency Shelters Open in Response to Flooding',
          content: 'Several emergency shelters have been opened across the city to accommodate those displaced by flooding. Locations include community centers and public schools.'
        },
        {
          title: 'Road Closures Due to Flooding',
          content: 'Multiple roads have been closed due to flooding. Authorities advise against unnecessary travel and remind residents not to drive through flooded areas.'
        }
      ],
      hurricane: [
        {
          title: 'Hurricane Warning in Effect',
          content: 'A hurricane warning is in effect for the East Coast. Residents should complete preparation activities and follow evacuation orders if issued.'
        },
        {
          title: 'Emergency Response Teams Deployed',
          content: 'Emergency response teams have been deployed to the affected areas. Resources include rescue personnel, medical staff, and relief supplies.'
        },
        {
          title: 'Power Outages Expected During Hurricane',
          content: 'Widespread power outages are expected during the hurricane. Residents should prepare by charging devices and securing emergency supplies.'
        }
      ],
      earthquake: [
        {
          title: 'Magnitude 6.2 Earthquake Reported',
          content: 'A magnitude 6.2 earthquake has been reported. Assessment teams are evaluating structural damage and casualties.'
        },
        {
          title: 'Aftershocks Continue Following Major Earthquake',
          content: 'Aftershocks continue to be felt following the major earthquake. Residents are advised to stay away from damaged buildings and infrastructure.'
        },
        {
          title: 'Emergency Response Activated for Earthquake Victims',
          content: 'Emergency response has been activated to assist earthquake victims. Search and rescue operations are ongoing in affected areas.'
        }
      ],
      wildfire: [
        {
          title: 'Wildfire Evacuation Orders Expanded',
          content: 'Evacuation orders have been expanded due to the rapidly spreading wildfire. Residents should leave immediately and follow designated evacuation routes.'
        },
        {
          title: 'Air Quality Alert Due to Wildfire Smoke',
          content: 'An air quality alert has been issued due to wildfire smoke. Vulnerable populations should stay indoors and use air filtering systems if available.'
        },
        {
          title: 'Firefighting Resources Deployed to Contain Wildfire',
          content: 'Additional firefighting resources have been deployed to contain the wildfire. This includes ground crews, aircraft, and specialized equipment.'
        }
      ],
      general: [
        {
          title: 'Emergency Declaration Approved',
          content: 'An emergency declaration has been approved, releasing federal funds for disaster response and recovery efforts.'
        },
        {
          title: 'Disaster Recovery Center Opens',
          content: 'A disaster recovery center has opened to provide in-person assistance to individuals and businesses affected by the recent disaster.'
        },
        {
          title: 'Volunteers Needed for Disaster Relief',
          content: 'Volunteers are needed to assist with disaster relief efforts. Those interested can register through approved relief organizations.'
        }
      ]
    };
    
    // Determine which sample updates to use based on tags
    let relevantUpdates = sampleUpdates.general;
    
    // Check for specific disaster types in tags
    const lowercaseTags = tags.map(tag => tag.toLowerCase());
    
    if (lowercaseTags.some(tag => ['flood', 'flooding'].includes(tag))) {
      relevantUpdates = [...relevantUpdates, ...sampleUpdates.flood];
    }
    
    if (lowercaseTags.some(tag => ['hurricane', 'cyclone', 'storm'].includes(tag))) {
      relevantUpdates = [...relevantUpdates, ...sampleUpdates.hurricane];
    }
    
    if (lowercaseTags.some(tag => ['earthquake', 'seismic'].includes(tag))) {
      relevantUpdates = [...relevantUpdates, ...sampleUpdates.earthquake];
    }
    
    if (lowercaseTags.some(tag => ['wildfire', 'fire'].includes(tag))) {
      relevantUpdates = [...relevantUpdates, ...sampleUpdates.wildfire];
    }
    
    // Generate mock updates
    for (let i = 0; i < updateCount; i++) {
      // Pick a random update from the relevant ones
      const randomUpdate = relevantUpdates[Math.floor(Math.random() * relevantUpdates.length)];
      
      // Random timestamp within the last 72 hours
      const timestamp = new Date(now.getTime() - Math.floor(Math.random() * 72 * 60 * 60 * 1000));
      
      updates.push({
        source: website.name,
        title: randomUpdate.title,
        content: randomUpdate.content,
        url: website.url,
        published_at: timestamp.toISOString(),
        fetched_at: now.toISOString(),
      });
    }
    
    return updates;
  }
};

module.exports = browsePageService;
