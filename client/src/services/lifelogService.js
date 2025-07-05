import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class LifelogService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds timeout
    });
  }

  /**
   * Set API key for requests (not used - we pass API key per request)
   * @param {string} apiKey - Limitless.ai API key
   */
  setApiKey(apiKey) {
    // Removed to prevent header duplication
    // API key is now passed per request only
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} True if valid
   */
  async validateApiKey(apiKey) {
    try {
      const response = await this.client.get('/health', {
        headers: { 'X-API-Key': apiKey }
      });
      return response.status === 200;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get available dates with lifelog data
   * @param {string} apiKey - API key
   * @returns {Promise<Array>} Array of available dates
   */
  async getAvailableDates(apiKey) {
    try {
      const response = await this.client.get('/dates', {
        headers: { 'X-API-Key': apiKey }
      });
      return response.data.dates || [];
    } catch (error) {
      console.error('Error fetching available dates:', error);
      throw new Error('Failed to fetch available dates');
    }
  }

  /**
   * Get raw lifelogs for a specific date
   * @param {string} apiKey - API key
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {object} options - Additional options
   * @returns {Promise<object>} Lifelog data
   */
  async getLifelogs(apiKey, date, options = {}) {
    try {
      const params = {
        timezone: options.timezone || 'UTC',
        format: 'raw',
        ...options
      };

      const response = await this.client.get(`/lifelogs/${date}`, {
        headers: { 'X-API-Key': apiKey },
        params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching lifelogs:', error);
      throw new Error(`Failed to fetch lifelogs: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Process lifelogs for ChatGPT optimization
   * @param {string} apiKey - API key
   * @param {object} options - Processing options
   * @returns {Promise<object>} Processed lifelog data
   */
  async processLifelogs(apiKey, options) {
    try {
      const response = await this.client.post('/process', options, {
        headers: { 'X-API-Key': apiKey }
      });

      return response.data;
    } catch (error) {
      console.error('Error processing lifelogs:', error);
      throw new Error(`Processing failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Batch process multiple dates
   * @param {string} apiKey - API key
   * @param {object} options - Batch processing options
   * @returns {Promise<object>} Batch processing results
   */
  async batchProcess(apiKey, options) {
    try {
      const response = await this.client.post('/batch-process', options, {
        headers: { 'X-API-Key': apiKey },
        timeout: 120000 // 2 minutes for batch processing
      });

      return response.data;
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw new Error(`Batch processing failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get optimized lifelogs for ChatGPT
   * @param {string} apiKey - API key
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {object} options - Optimization options
   * @returns {Promise<object>} Optimized lifelog data
   */
  async getOptimizedLifelogs(apiKey, date, options = {}) {
    try {
      const params = {
        format: 'chatgpt',
        timezone: options.timezone || 'UTC',
        maxTokens: options.maxTokens || 8000,
        includeTimestamps: options.includeTimestamps !== false,
        includeSpeakers: options.includeSpeakers !== false,
        summarizeLevel: options.summarizeLevel || 'medium'
      };

      const response = await this.client.get(`/lifelogs/${date}`, {
        headers: { 'X-API-Key': apiKey },
        params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching optimized lifelogs:', error);
      throw new Error(`Failed to fetch optimized lifelogs: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Download processed data as file
   * @param {string} content - Content to download
   * @param {string} filename - Filename
   * @param {string} type - File type (text/plain, application/json, etc.)
   */
  downloadAsFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy content to clipboard
   * @param {string} content - Content to copy
   * @returns {Promise<boolean>} True if successful
   */
  async copyToClipboard(content) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Format date for API requests
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date string (YYYY-MM-DD)
   */
  formatDate(date) {
    if (typeof date === 'string') {
      return date.split('T')[0]; // Remove time part if present
    }
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse date range string
   * @param {string} dateRange - Date range string (e.g., "2024-01-01 to 2024-01-07")
   * @returns {object} Start and end dates
   */
  parseDateRange(dateRange) {
    const parts = dateRange.split(' to ');
    if (parts.length !== 2) {
      throw new Error('Invalid date range format');
    }
    return {
      startDate: parts[0].trim(),
      endDate: parts[1].trim()
    };
  }

  /**
   * Get date range array
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Array} Array of date strings
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }

    const currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text - Text to count tokens for
   * @returns {number} Estimated token count
   */
  estimateTokenCount(text) {
    if (!text || typeof text !== 'string') return 0;
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Consolidated export optimized for ChatGPT memory integration
   * @param {string} apiKey - API key for authentication
   * @param {string} date - Date to export
   * @param {object} options - Export options
   * @returns {Promise<object>} Consolidated export results
   */
  async consolidatedExport(apiKey, date, options = {}) {
    try {
      const headers = apiKey ? { 'X-API-Key': apiKey } : {};
      
      const response = await this.client.post('/consolidated-export', {
        date,
        ...options
      }, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Consolidated export error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create consolidated export');
    }
  }

  /**
   * Multi-file export for ChatGPT memory building
   * @param {string} apiKey - API key for authentication
   * @param {string} date - Date to export
   * @param {object} options - Export options
   * @returns {Promise<object>} Multi-file export data
   */
  async multiFileExport(apiKey, date, options = {}) {
    try {
      const response = await this.client.post('/multi-file-export', {
        date,
        ...options
      }, {
        headers: apiKey ? { 'X-API-Key': apiKey } : {}
      });

      return response.data;
    } catch (error) {
      console.error('Error in multi-file export:', error);
      throw new Error(`Multi-file export failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get processing statistics from results
   * @param {object} results - Processing results
   * @returns {object} Statistics object
   */
  getProcessingStats(results) {
    if (!results) return {};

    const originalCount = results.originalCount || results.metadata?.originalEntries || 0;
    const finalTokens = results.tokenCount || results.totalTokens || 0;
    const originalTokens = results.metadata?.originalTokens || finalTokens;
    
    const compressionRatio = originalTokens > 0 
      ? Math.round(((originalTokens - finalTokens) / originalTokens) * 100)
      : 0;

    return {
      originalCount,
      finalTokens,
      originalTokens,
      compressionRatio,
      strategy: results.strategy || 'unknown',
      topics: results.topics || [],
      dateRange: results.metadata?.dateRange || null
    };
  }
}

// Export singleton instance
export const lifelogService = new LifelogService();
export default LifelogService;