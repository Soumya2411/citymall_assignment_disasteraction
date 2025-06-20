const { GoogleGenAI } = require('@google/genai');
const logger = require('./logger');
const cacheService = require('./cacheService');
const axios = require('axios');

// Initialize Gemini API client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = 'gemini-2.5-flash'; // or 'gemini-2.5-pro'

/**
 * Service for interacting with Google Gemini API
 */
const geminiService = {
  async extractLocation(description) {
    const cacheKey = `loc_${Buffer.from(description).toString('base64')}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const prompt = `Extract the most specific location name mentioned in the following disaster description. 
    Return ONLY the location name without any explanation or additional text.
    If no location is found, return exactly "LOCATION_NOT_FOUND".
    
    Description: ${description}`;    try {      
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt
      });
      const text = response.text.trim();
      
      await cacheService.set(cacheKey, text);
      logger.info({ location: text }, 'Extracted location');

      return text === 'LOCATION_NOT_FOUND' ? null : text;
    } catch (error) {
      logger.error({ error: error.message, description }, 'Error extracting location');
      throw new Error('Failed to extract location: ' + error.message);
    }
  },

  async verifyImage(imageUrl) {
    const cacheKey = `verif_${Buffer.from(imageUrl).toString('base64')}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;    try {      
      let base64, mimeType;
      
      // Check if the URL is already a base64 data URL
      if (imageUrl.startsWith('data:')) {
        // Extract mime type and base64 data from data URL
        // Format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64 = matches[2];
        } else {
          throw new Error('Invalid data URL format');
        }
      } else {
        // Fetch the image and convert to base64
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        base64 = Buffer.from(imageResponse.data).toString('base64');
        mimeType = imageResponse.headers['content-type'];
      }

      const prompt = `Analyze this disaster-related image for authenticity and provide feedback.
      Look for signs of manipulation, doctoring, or if the image is being presented out of context.
      Return a JSON object with the following fields:
      {
        "authentic": boolean (true if the image appears authentic, false if suspicious),
        "confidence": number (0-100 indicating confidence in the assessment),
        "analysis": string (brief explanation of your findings),
        "issues": array of strings (specific issues detected, empty if none)      }`;      
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } }
        ]
      });
      
      const raw = response.text.trim();
      
      let resultObject;
      try {
        // Try to extract JSON from the response
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}') + 1;
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const json = raw.substring(jsonStart, jsonEnd);
          resultObject = JSON.parse(json);
        } else {
          // Fallback if no JSON is found
          resultObject = { 
            authentic: raw.toLowerCase().includes('authentic'), 
            confidence: 50, 
            analysis: raw,
            issues: []
          };
        }
      } catch (parseError) {
        logger.warn({ error: parseError.message }, 'Failed to parse Gemini response as JSON');
        resultObject = { 
          authentic: raw.toLowerCase().includes('authentic'), 
          confidence: 50, 
          analysis: raw,
          issues: []
        };
      }

      await cacheService.set(cacheKey, resultObject);
      logger.info({ authentic: resultObject.authentic }, 'Image verified');
      return resultObject;
    } catch (error) {
      logger.error({ error: error.message, imageUrl }, 'Error verifying image');
      throw new Error('Failed to verify image: ' + error.message);
    }
  }
};

module.exports = geminiService;
