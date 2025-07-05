import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Header from './components/Header';
import ApiKeyInput from './components/ApiKeyInput';
import DateSelector from './components/DateSelector';
import ProcessingOptions from './components/ProcessingOptions';
import ProcessingResults from './components/ProcessingResults';
import BatchProcessor from './components/BatchProcessor';
import LoadingSpinner from './components/LoadingSpinner';

// Services
import { lifelogService } from './services/lifelogService';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState([]);
  const [processingOptions, setProcessingOptions] = useState({
    timezone: 'UTC',
    maxTokens: 8000,
    includeTimestamps: true,
    includeSpeakers: true,
    summarizeLevel: 'medium',
    outputFormat: 'markdown',
    exportFormat: 'consolidated'
  });
  const [processingResults, setProcessingResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'batch'
  const [apiKeyValid, setApiKeyValid] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('limitless_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      validateApiKey(savedApiKey);
    }
  }, []);

  // Validate API key
  const validateApiKey = async (key) => {
    if (!key) {
      setApiKeyValid(false);
      return;
    }

    try {
      setIsLoading(true);
      const isValid = await lifelogService.validateApiKey(key);
      setApiKeyValid(isValid);
      
      if (isValid) {
        localStorage.setItem('limitless_api_key', key);
        toast.success('API key validated successfully!');
        // Don't automatically load dates - let user initiate this
      } else {
        toast.error('Invalid API key. Please check and try again.');
        localStorage.removeItem('limitless_api_key');
      }
    } catch (error) {
      console.error('API key validation error:', error);
      toast.error('Failed to validate API key');
      setApiKeyValid(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Load available dates
  const loadAvailableDates = async (key) => {
    try {
      const dates = await lifelogService.getAvailableDates(key);
      setAvailableDates(dates);
    } catch (error) {
      console.error('Error loading available dates:', error);
      toast.error('Failed to load available dates');
    }
  };

  // Handle API key change
  const handleApiKeyChange = (newApiKey) => {
    setApiKey(newApiKey);
    if (newApiKey) {
      validateApiKey(newApiKey);
    } else {
      setApiKeyValid(false);
      setAvailableDates([]);
      localStorage.removeItem('limitless_api_key');
    }
  };

  // Process single date
  const processSingleDate = async () => {
    if (!apiKey || !selectedDate) {
      toast.error('Please provide API key and select a date');
      return;
    }

    try {
      setIsLoading(true);
      setProcessingResults(null);

      let results;
      if (processingOptions.exportFormat === 'consolidated') {
        results = await lifelogService.consolidatedExport(apiKey, selectedDate, processingOptions);
        results.exportType = 'consolidated';
      } else {
        results = await lifelogService.processLifelogs(apiKey, {
          date: selectedDate,
          ...processingOptions
        });
        results.exportType = 'standard';
      }

      setProcessingResults(results);
      toast.success('Lifelogs processed successfully!');
    } catch (error) {
      console.error('Processing error:', error);
      toast.error(`Processing failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear results
  const clearResults = () => {
    setProcessingResults(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* API Key Input */}
        <div className="mb-8">
          <ApiKeyInput
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
            isValid={apiKeyValid}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content - Only show if API key is valid */}
        {apiKeyValid && (
          <>
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'single'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Single Day Processing
                  </button>
                  <button
                    onClick={() => setActiveTab('batch')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'batch'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Batch Processing
                  </button>
                </nav>
              </div>
            </div>

            {/* Single Day Processing Tab */}
            {activeTab === 'single' && (
              <div className="space-y-8">
                {/* Date Selection */}
                <div className="card">
                  <DateSelector
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    availableDates={availableDates}
                    isLoading={isLoading}
                    onLoadDates={() => loadAvailableDates(apiKey)}
                    apiKeyValid={apiKeyValid}
                  />
                </div>

                {/* Processing Options */}
                <div className="card">
                  <ProcessingOptions
                    options={processingOptions}
                    onOptionsChange={setProcessingOptions}
                  />
                </div>

                {/* Process Button */}
                <div className="flex justify-center">
                  <button
                    onClick={processSingleDate}
                    disabled={isLoading || !selectedDate}
                    className="btn-primary px-8 py-3 text-lg"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      'Process Lifelogs'
                    )}
                  </button>
                </div>

                {/* Results */}
                {processingResults && (
                  <div className="card">
                    <ProcessingResults
                      results={processingResults}
                      onClear={clearResults}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Batch Processing Tab */}
            {activeTab === 'batch' && (
              <div className="card">
                <BatchProcessor
                  apiKey={apiKey}
                  availableDates={availableDates}
                  defaultOptions={processingOptions}
                />
              </div>
            )}
          </>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
              <LoadingSpinner size="lg" />
              <span className="text-lg font-medium">Processing...</span>
            </div>
          </div>
        )}
      </main>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;