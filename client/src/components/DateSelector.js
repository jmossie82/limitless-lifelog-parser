import React, { useState } from 'react';
import { Calendar, Clock, Star, ChevronDown, RefreshCw } from 'lucide-react';

const DateSelector = ({ selectedDate, onDateChange, availableDates, isLoading, onLoadDates, apiKeyValid }) => {
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  const handleLoadDates = async () => {
    setIsLoadingDates(true);
    await onLoadDates();
    setIsLoadingDates(false);
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const selectedDateInfo = availableDates.find(d => d.date === selectedDate);

  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <Calendar className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Select Date</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Date Input */}
        <div>
          <label htmlFor="date" className="label">
            Choose Date
          </label>
          <div className="relative">
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="input-field pr-10"
              disabled={isLoading}
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          
          {selectedDate && (
            <div className="mt-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>{formatDate(selectedDate)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {getRelativeDate(selectedDate)}
              </div>
            </div>
          )}
        </div>

        {/* Date Info */}
        <div>
          <label className="label">Date Information</label>
          <div className="bg-gray-50 rounded-lg p-4 h-full flex flex-col justify-center">
            {selectedDateInfo ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Lifelog Entries:</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {selectedDateInfo.count}
                  </span>
                </div>
                {selectedDateInfo.hasStarred && (
                  <div className="flex items-center space-x-2 text-sm text-yellow-600">
                    <Star className="h-4 w-4 fill-current" />
                    <span>Contains starred entries</span>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Data available for processing
                </div>
              </div>
            ) : selectedDate ? (
              <div className="text-center text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No lifelog data found for this date</p>
                <p className="text-xs mt-1">Try selecting a different date</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a date to view information</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Load Available Dates */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <label className="label">Available Dates</label>
          {apiKeyValid && (
            <button
              onClick={handleLoadDates}
              disabled={isLoadingDates || isLoading}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingDates ? 'animate-spin' : ''}`} />
              <span>{isLoadingDates ? 'Loading...' : 'Load Dates'}</span>
            </button>
          )}
        </div>
        
        {!apiKeyValid && (
          <p className="text-sm text-gray-500 italic">Enter a valid API key to load available dates</p>
        )}
      </div>

      {/* Available Dates Quick Select */}
      {availableDates.length > 0 && (
        <div className="mt-4">
          <label className="label">Recent Dates with Data</label>
          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="input-field pr-10 appearance-none"
              disabled={isLoading}
            >
              <option value="">Select from recent dates...</option>
              {availableDates.slice(0, 10).map((dateInfo) => (
                <option key={dateInfo.date} value={dateInfo.date}>
                  {formatDate(dateInfo.date)} ({dateInfo.count} entries)
                  {dateInfo.hasStarred ? ' ⭐' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
          
          {availableDates.length > 10 && (
            <p className="text-xs text-gray-500 mt-2">
              Showing 10 most recent dates. Use the date picker above for older dates.
            </p>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 flex items-center justify-center py-4">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Loading available dates...</span>
        </div>
      )}

      {/* No Data Message */}
      {!isLoading && availableDates.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">No recent data found</p>
              <p className="text-xs text-yellow-700 mt-1">
                Make sure your Limitless pendant is paired and has recorded data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateSelector;