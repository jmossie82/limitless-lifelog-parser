import React, { useState } from 'react';
import { Key, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ApiKeyInput = ({ apiKey, onApiKeyChange, isValid, isLoading }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);

  const handleSubmit = (e) => {
    e.preventDefault();
    onApiKeyChange(localApiKey.trim());
  };

  const handleClear = () => {
    setLocalApiKey('');
    onApiKeyChange('');
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />;
    }
    if (apiKey && isValid) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (apiKey && !isValid) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <Key className="h-5 w-5 text-gray-400" />;
  };

  const getStatusMessage = () => {
    if (isLoading) return 'Validating API key...';
    if (apiKey && isValid) return 'API key is valid and ready to use';
    if (apiKey && !isValid) return 'Invalid API key. Please check and try again.';
    return 'Enter your Limitless.ai API key to get started';
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-blue-600';
    if (apiKey && isValid) return 'text-green-600';
    if (apiKey && !isValid) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-4">
        <Key className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">API Configuration</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="label">
            Limitless.ai API Key
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="Enter your Limitless.ai API key"
              className="input-field pr-20"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {getStatusIcon()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 text-sm ${getStatusColor()}`}>
            <span>{getStatusMessage()}</span>
          </div>
          
          <div className="flex space-x-2">
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary"
                disabled={isLoading}
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !localApiKey.trim() || localApiKey === apiKey}
            >
              {isLoading ? 'Validating...' : 'Validate Key'}
            </button>
          </div>
        </div>
      </form>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-gray-900 mb-2">How to get your API key:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Open your Limitless Desktop or Web App</li>
              <li>Navigate to the Developer section</li>
              <li>Click "Create API Key" to generate a new key</li>
              <li>Copy and paste the key above</li>
            </ol>
            <p className="mt-3 text-xs text-gray-600">
              <strong>Note:</strong> Your API key is stored locally and never shared with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;