const axios = require('axios');

class LifelogProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.limitless.ai/v1';
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get lifelogs for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} timezone - IANA timezone (default: UTC)
   * @param {object} options - Additional options
   * @returns {Promise<Array>} Array of lifelog entries
   */
  async getLifelogsForDate(date, timezone = 'UTC', options = {}) {
    try {
      const params = {
        date,
        timezone,
        includeMarkdown: options.includeMarkdown !== false,
        includeHeadings: options.includeHeadings !== false,
        limit: options.limit || 10,
        direction: options.direction || 'desc'
      };

      // Add optional filters
      if (options.isStarred !== undefined) {
        params.isStarred = options.isStarred;
      }

      let allLifelogs = [];
      let cursor = null;

      // Paginate through all results
      console.log(`Fetching lifelogs for ${date}...`);
      
      do {
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await this.axiosInstance.get('/lifelogs', { params });
        
        if (response.data && response.data.data && response.data.data.lifelogs) {
          allLifelogs = allLifelogs.concat(response.data.data.lifelogs);
          cursor = response.data.meta?.lifelogs?.nextCursor;
          
          console.log(`Found ${response.data.data.lifelogs.length} lifelogs in this batch (total: ${allLifelogs.length})`);
        } else {
          break;
        }

        // Add delay between paginated requests to avoid rate limiting
        if (cursor) {
          console.log(`Getting next page...`);
          await this.delay(1000);
        }
      } while (cursor && allLifelogs.length < (options.maxEntries || 1000));

      console.log(`✅ Total lifelogs found for ${date}: ${allLifelogs.length}`);

      return allLifelogs;
    } catch (error) {
      console.error('Error fetching lifelogs:', error.response?.data || error.message);
      throw new Error(`Failed to fetch lifelogs: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get a specific lifelog by ID
   * @param {string} id - Lifelog ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} Lifelog entry
   */
  async getLifelogById(id, options = {}) {
    try {
      const params = {
        includeMarkdown: options.includeMarkdown !== false,
        includeHeadings: options.includeHeadings !== false
      };

      const response = await this.axiosInstance.get(`/lifelogs/${id}`, { params });
      
      if (response.data && response.data.data && response.data.data.lifelog) {
        return response.data.data.lifelog;
      }
      
      throw new Error('Lifelog not found');
    } catch (error) {
      console.error('Error fetching lifelog by ID:', error.response?.data || error.message);
      throw new Error(`Failed to fetch lifelog: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get lifelogs within a date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {string} timezone - IANA timezone
   * @param {object} options - Additional options
   * @returns {Promise<Array>} Array of lifelog entries
   */
  async getLifelogsInRange(startDate, endDate, timezone = 'UTC', options = {}) {
    try {
      const params = {
        start: startDate,
        end: endDate,
        timezone,
        includeMarkdown: options.includeMarkdown !== false,
        includeHeadings: options.includeHeadings !== false,
        limit: options.limit || 10,
        direction: options.direction || 'desc'
      };

      if (options.isStarred !== undefined) {
        params.isStarred = options.isStarred;
      }

      let allLifelogs = [];
      let cursor = null;

      do {
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await this.axiosInstance.get('/lifelogs', { params });
        
        if (response.data && response.data.data && response.data.data.lifelogs) {
          allLifelogs = allLifelogs.concat(response.data.data.lifelogs);
          cursor = response.data.meta?.lifelogs?.nextCursor;
        } else {
          break;
        }
      } while (cursor && allLifelogs.length < (options.maxEntries || 1000));

      return allLifelogs;
    } catch (error) {
      console.error('Error fetching lifelogs in range:', error.response?.data || error.message);
      throw new Error(`Failed to fetch lifelogs: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get available dates with lifelog data (approximation)
   * @param {number} days - Number of recent days to check (default: 30)
   * @returns {Promise<Array>} Array of dates with data
   */
  async getAvailableDates(days = 30) {
    try {
      const dates = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        try {
          const lifelogs = await this.getLifelogsForDate(dateString, 'UTC', { limit: 1 });
          if (lifelogs.length > 0) {
            dates.push({
              date: dateString,
              count: lifelogs.length,
              hasStarred: lifelogs.some(log => log.isStarred)
            });
          }
        } catch (error) {
          // Skip dates with errors
          continue;
        }
      }

      return dates.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Error getting available dates:', error);
      throw new Error('Failed to get available dates');
    }
  }

  /**
   * Extract and clean content from lifelog entries
   * @param {Array} lifelogs - Array of lifelog entries
   * @returns {Array} Cleaned and structured content
   */
  extractContent(lifelogs) {
    return lifelogs.map(lifelog => {
      const content = {
        id: lifelog.id,
        title: lifelog.title,
        startTime: lifelog.startTime,
        endTime: lifelog.endTime,
        isStarred: lifelog.isStarred,
        markdown: lifelog.markdown,
        extractedText: '',
        speakers: new Set(),
        topics: [],
        duration: this.calculateDuration(lifelog.startTime, lifelog.endTime)
      };

      // Extract content from structured nodes
      if (lifelog.contents && Array.isArray(lifelog.contents)) {
        content.extractedText = this.extractTextFromNodes(lifelog.contents, content.speakers);
      }

      // Convert speakers set to array
      content.speakers = Array.from(content.speakers);

      // Extract topics from headings
      content.topics = this.extractTopics(lifelog.contents);

      return content;
    });
  }

  /**
   * Extract text content from content nodes recursively
   * @param {Array} nodes - Content nodes
   * @param {Set} speakers - Set to collect speaker names
   * @returns {string} Extracted text
   */
  extractTextFromNodes(nodes, speakers = new Set()) {
    let text = '';
    
    for (const node of nodes) {
      if (node.content) {
        // Add speaker information if available
        if (node.speakerName) {
          speakers.add(node.speakerName);
          text += `[${node.speakerName}]: ${node.content}\n`;
        } else {
          text += `${node.content}\n`;
        }
      }

      // Process child nodes recursively
      if (node.children && Array.isArray(node.children)) {
        text += this.extractTextFromNodes(node.children, speakers);
      }
    }

    return text;
  }

  /**
   * Extract topics from heading nodes
   * @param {Array} nodes - Content nodes
   * @returns {Array} Array of topics
   */
  extractTopics(nodes) {
    const topics = [];
    
    if (!nodes || !Array.isArray(nodes)) return topics;

    for (const node of nodes) {
      if (node.type && (node.type.includes('heading') || node.type === 'heading1' || node.type === 'heading2')) {
        topics.push(node.content);
      }

      // Process child nodes recursively
      if (node.children && Array.isArray(node.children)) {
        topics.push(...this.extractTopics(node.children));
      }
    }

    return topics;
  }

  /**
   * Calculate duration between start and end times
   * @param {string} startTime - ISO timestamp
   * @param {string} endTime - ISO timestamp
   * @returns {number} Duration in minutes
   */
  calculateDuration(startTime, endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return Math.round((end - start) / (1000 * 60)); // Duration in minutes
    } catch (error) {
      return 0;
    }
  }

  /**
   * Add delay to prevent rate limiting
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate API key by making a test request
   * @returns {Promise<boolean>} True if API key is valid
   */
  async validateApiKey() {
    try {
      const response = await this.axiosInstance.get('/lifelogs', { 
        params: { limit: 1 } 
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = LifelogProcessor;