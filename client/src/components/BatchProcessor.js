import React, { useState } from 'react';
import { 
  Calendar, 
  Play, 
  Download, 
  BarChart3, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { lifelogService } from '../services/lifelogService';
import LoadingSpinner from './LoadingSpinner';

const BatchProcessor = ({ apiKey, availableDates, defaultOptions }) => {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [batchOptions, setBatchOptions] = useState({
    ...defaultOptions,
    maxTokensPerDay: 8000
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (key, value) => {
    setBatchOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getDateRangeArray = () => {
    if (!dateRange.startDate || !dateRange.endDate) return [];
    try {
      return lifelogService.getDateRange(dateRange.startDate, dateRange.endDate);
    } catch (error) {
      return [];
    }
  };

  const startBatchProcessing = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    const dateArray = getDateRangeArray();
    if (dateArray.length > 30) {
      toast.error('Date range too large. Please select a range of 30 days or less.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress({ current: 0, total: dateArray.length });
      setResults(null);

      const batchResults = await lifelogService.batchProcess(apiKey, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        timezone: batchOptions.timezone,
        maxTokensPerDay: batchOptions.maxTokensPerDay,
        outputFormat: batchOptions.outputFormat
      });

      setResults(batchResults);
      toast.success(`Batch processing completed! Processed ${batchResults.results.length} dates.`);
    } catch (error) {
      console.error('Batch processing error:', error);
      toast.error(`Batch processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const downloadAllResults = () => {
    if (!results || !results.results) return;

    const allContent = results.results
      .filter(result => result.success)
      .map(result => {
        return `# Lifelog for ${result.date}\n\n${result.output}\n\n---\n\n`;
      })
      .join('');

    const filename = `lifelogs-batch-${dateRange.startDate}-to-${dateRange.endDate}.md`;
    lifelogService.downloadAsFile(allContent, filename, 'text/plain');
    toast.success('Batch results downloaded successfully!');
  };

  const downloadIndividualResult = (result) => {
    const extension = batchOptions.outputFormat === 'json' ? 'json' : 
                     batchOptions.outputFormat === 'markdown' ? 'md' : 'txt';
    const filename = `lifelog-${result.date}.${extension}`;
    const mimeType = extension === 'json' ? 'application/json' : 'text/plain';
    
    const content = typeof result.output === 'string' 
      ? result.output 
      : JSON.stringify(result.output, null, 2);
    
    lifelogService.downloadAsFile(content, filename, mimeType);
  };

  const getSuccessRate = () => {
    if (!results || !results.results) return 0;
    const successful = results.results.filter(r => r.success).length;
    return Math.round((successful / results.results.length) * 100);
  };

  const getTotalTokens = () => {
    if (!results || !results.results) return 0;
    return results.results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.tokenCount || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Calendar className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Batch Processing</h2>
      </div>

      {/* Date Range Selection */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="label">Start Date</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
            className="input-field"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="label">End Date</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
            className="input-field"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Date Range Info */}
      {dateRange.startDate && dateRange.endDate && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Date Range Summary</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Total Days:</span>
              <div className="font-medium text-blue-900">{getDateRangeArray().length}</div>
            </div>
            <div>
              <span className="text-blue-700">Start:</span>
              <div className="font-medium text-blue-900">
                {new Date(dateRange.startDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="text-blue-700">End:</span>
              <div className="font-medium text-blue-900">
                {new Date(dateRange.endDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="text-blue-700">Est. Tokens:</span>
              <div className="font-medium text-blue-900">
                {(getDateRangeArray().length * batchOptions.maxTokensPerDay).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Options */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="label">Tokens Per Day</label>
          <select
            value={batchOptions.maxTokensPerDay}
            onChange={(e) => handleOptionChange('maxTokensPerDay', parseInt(e.target.value))}
            className="input-field"
            disabled={isProcessing}
          >
            <option value={4000}>4,000 tokens</option>
            <option value={8000}>8,000 tokens</option>
            <option value={16000}>16,000 tokens</option>
            <option value={32000}>32,000 tokens</option>
          </select>
        </div>
        <div>
          <label className="label">Output Format</label>
          <select
            value={batchOptions.outputFormat}
            onChange={(e) => handleOptionChange('outputFormat', e.target.value)}
            className="input-field"
            disabled={isProcessing}
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="plain">Plain Text</option>
          </select>
        </div>
      </div>

      {/* Processing Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={startBatchProcessing}
            disabled={isProcessing || !dateRange.startDate || !dateRange.endDate}
            className="btn-primary flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start Batch Processing</span>
              </>
            )}
          </button>
          
          {getDateRangeArray().length > 10 && (
            <div className="flex items-center space-x-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Large batch - this may take several minutes</span>
            </div>
          )}
        </div>

        {results && (
          <button
            onClick={downloadAllResults}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download All</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Processing progress</span>
            <span className="font-medium">
              {progress.current} of {progress.total} dates
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Dates</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {results.results.length}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {getSuccessRate()}%
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Total Tokens</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {getTotalTokens().toLocaleString()}
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Date Range</span>
              </div>
              <div className="text-sm font-bold text-yellow-600">
                {results.dateRange.startDate} to {results.dateRange.endDate}
              </div>
            </div>
          </div>

          {/* Individual Results */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Individual Results</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.results.map((result, index) => (
                <div
                  key={result.date}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {new Date(result.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      {result.success ? (
                        <div className="text-sm text-gray-600">
                          {result.count} entries • {result.tokenCount?.toLocaleString()} tokens
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {result.success && (
                    <button
                      onClick={() => downloadIndividualResult(result)}
                      className="btn-secondary btn-sm flex items-center space-x-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;