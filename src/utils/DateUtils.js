class DateUtils {
  /**
   * Get array of dates between start and end date
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Array} Array of date strings
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure start is not after end
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
   * Format date for display
   * @param {string|Date} date - Date to format
   * @param {string} format - Format type ('short', 'long', 'iso')
   * @returns {string} Formatted date string
   */
  formatDate(date, format = 'short') {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'iso':
        return dateObj.toISOString().split('T')[0];
      case 'short':
      default:
        return dateObj.toLocaleDateString('en-US');
    }
  }

  /**
   * Get relative time description
   * @param {string|Date} date - Date to compare
   * @returns {string} Relative time string
   */
  getRelativeTime(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now - dateObj;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  /**
   * Validate date string format
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid YYYY-MM-DD format
   */
  isValidDateString(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }

  /**
   * Get timezone offset string
   * @param {string} timezone - IANA timezone identifier
   * @returns {string} Timezone offset string
   */
  getTimezoneOffset(timezone = 'UTC') {
    try {
      const date = new Date();
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
      
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(offset));
      const minutes = Math.floor((Math.abs(offset) % 1) * 60);
      
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '+00:00'; // Default to UTC
    }
  }

  /**
   * Get common timezone options
   * @returns {Array} Array of timezone objects
   */
  getCommonTimezones() {
    return [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
      { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: this.getTimezoneOffset('America/New_York') },
      { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: this.getTimezoneOffset('America/Chicago') },
      { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: this.getTimezoneOffset('America/Denver') },
      { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: this.getTimezoneOffset('America/Los_Angeles') },
      { value: 'Europe/London', label: 'London (GMT/BST)', offset: this.getTimezoneOffset('Europe/London') },
      { value: 'Europe/Paris', label: 'Central European Time', offset: this.getTimezoneOffset('Europe/Paris') },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time', offset: this.getTimezoneOffset('Asia/Tokyo') },
      { value: 'Asia/Shanghai', label: 'China Standard Time', offset: this.getTimezoneOffset('Asia/Shanghai') },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time', offset: this.getTimezoneOffset('Australia/Sydney') }
    ];
  }

  /**
   * Convert date to specific timezone
   * @param {string|Date} date - Date to convert
   * @param {string} timezone - Target timezone
   * @returns {string} ISO string in target timezone
   */
  convertToTimezone(date, timezone) {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(dateObj).replace(' ', 'T');
    } catch (error) {
      return date.toString();
    }
  }

  /**
   * Get date boundaries for a specific date in timezone
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} timezone - Timezone identifier
   * @returns {object} Start and end timestamps
   */
  getDateBoundaries(date, timezone = 'UTC') {
    try {
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59.999`);

      return {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
        timezone
      };
    } catch (error) {
      throw new Error(`Invalid date format: ${date}`);
    }
  }

  /**
   * Parse duration string to minutes
   * @param {string} duration - Duration string (e.g., "1h 30m", "45m", "2h")
   * @returns {number} Duration in minutes
   */
  parseDuration(duration) {
    if (typeof duration !== 'string') return 0;

    const hourMatch = duration.match(/(\d+)h/);
    const minuteMatch = duration.match(/(\d+)m/);

    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;

    return hours * 60 + minutes;
  }

  /**
   * Format duration in minutes to human readable string
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration string
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get week boundaries for a given date
   * @param {string|Date} date - Reference date
   * @param {number} weekStart - Week start day (0 = Sunday, 1 = Monday)
   * @returns {object} Week start and end dates
   */
  getWeekBoundaries(date, weekStart = 1) {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    const day = dateObj.getDay();
    const diff = day - weekStart;
    
    const weekStartDate = new Date(dateObj);
    weekStartDate.setDate(dateObj.getDate() - diff);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    return {
      start: weekStartDate.toISOString().split('T')[0],
      end: weekEndDate.toISOString().split('T')[0]
    };
  }

  /**
   * Get month boundaries for a given date
   * @param {string|Date} date - Reference date
   * @returns {object} Month start and end dates
   */
  getMonthBoundaries(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    
    const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);

    return {
      start: monthStart.toISOString().split('T')[0],
      end: monthEnd.toISOString().split('T')[0]
    };
  }
}

module.exports = DateUtils;