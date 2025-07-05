import React from 'react';
import { Settings, Zap, Clock, Users, FileText, Globe } from 'lucide-react';

const ProcessingOptions = ({ options, onOptionsChange }) => {
  const handleOptionChange = (key, value) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };

  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Central European Time' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
    { value: 'Asia/Shanghai', label: 'China Standard Time' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time' }
  ];

  const tokenLimits = [
    { value: 4000, label: '4,000 tokens (GPT-3.5 Turbo)' },
    { value: 8000, label: '8,000 tokens (GPT-4)' },
    { value: 16000, label: '16,000 tokens (GPT-4 Extended)' },
    { value: 32000, label: '32,000 tokens (GPT-4 32k)' },
    { value: 64000, label: '64,000 tokens (Large Context)' },
    { value: 128000, label: '128,000 tokens (GPT-4 Turbo)' }
  ];

  const summarizeLevels = [
    { value: 'low', label: 'Low - Keep most details', description: 'Minimal compression, preserves context' },
    { value: 'medium', label: 'Medium - Balanced optimization', description: 'Good balance of detail and efficiency' },
    { value: 'high', label: 'High - Maximum compression', description: 'Aggressive summarization, key points only' }
  ];

  const outputFormats = [
    { value: 'markdown', label: 'Markdown', description: 'Structured format with headers and formatting' },
    { value: 'json', label: 'JSON', description: 'Structured data format for programmatic use' },
    { value: 'plain', label: 'Plain Text', description: 'Simple text format without formatting' }
  ];

  const exportFormats = [
    { 
      value: 'consolidated', 
      label: 'Consolidated Export (Recommended)', 
      description: 'Single optimized file for ChatGPT memory integration - much easier to upload!' 
    },
    { 
      value: 'multi-file', 
      label: 'Multi-File Export', 
      description: 'Multiple files split by token limits - requires uploading each file individually' 
    }
  ];

  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Processing Options</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Timezone Selection */}
          <div>
            <label className="label flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Timezone</span>
            </label>
            <select
              value={options.timezone}
              onChange={(e) => handleOptionChange('timezone', e.target.value)}
              className="input-field"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select your local timezone for accurate timestamp processing
            </p>
          </div>

          {/* Token Limit */}
          <div>
            <label className="label flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Token Limit</span>
            </label>
            <select
              value={options.maxTokens}
              onChange={(e) => handleOptionChange('maxTokens', parseInt(e.target.value))}
              className="input-field"
            >
              {tokenLimits.map((limit) => (
                <option key={limit.value} value={limit.value}>
                  {limit.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose based on your ChatGPT model's token limit
            </p>
          </div>

          {/* Summarization Level */}
          <div>
            <label className="label flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Summarization Level</span>
            </label>
            <div className="space-y-2">
              {summarizeLevels.map((level) => (
                <label key={level.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="summarizeLevel"
                    value={level.value}
                    checked={options.summarizeLevel === level.value}
                    onChange={(e) => handleOptionChange('summarizeLevel', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{level.label}</div>
                    <div className="text-xs text-gray-500">{level.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Include Options */}
          <div>
            <label className="label">Content Options</label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTimestamps}
                  onChange={(e) => handleOptionChange('includeTimestamps', e.target.checked)}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">Include Timestamps</span>
                </div>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Add time information to help ChatGPT understand when events occurred
              </p>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeSpeakers}
                  onChange={(e) => handleOptionChange('includeSpeakers', e.target.checked)}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">Include Speaker Names</span>
                </div>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Identify who said what in conversations and meetings
              </p>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="label">Export Format for ChatGPT</label>
            <div className="space-y-3">
              {exportFormats.map((format) => (
                <label key={format.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={options.exportFormat === format.value}
                    onChange={(e) => handleOptionChange('exportFormat', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className={`text-sm font-medium ${format.value === 'consolidated' ? 'text-green-700' : 'text-gray-900'}`}>
                      {format.label}
                    </div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Output Format */}
          <div>
            <label className="label">Output Format</label>
            <div className="space-y-2">
              {outputFormats.map((format) => (
                <label key={format.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="outputFormat"
                    value={format.value}
                    checked={options.outputFormat === format.value}
                    onChange={(e) => handleOptionChange('outputFormat', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Token Limit */}
          <div>
            <label className="label">Custom Token Limit</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1000"
                max="200000"
                step="1000"
                value={options.maxTokens}
                onChange={(e) => handleOptionChange('maxTokens', parseInt(e.target.value) || 8000)}
                className="input-field flex-1"
              />
              <span className="text-sm text-gray-500">tokens</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Fine-tune the token limit for your specific needs
            </p>
          </div>
        </div>
      </div>

      {/* Processing Preview */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Processing Preview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-blue-700 font-medium">Timezone:</span>
            <div className="text-blue-800">{options.timezone}</div>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Max Tokens:</span>
            <div className="text-blue-800">{options.maxTokens.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Summarization:</span>
            <div className="text-blue-800 capitalize">{options.summarizeLevel}</div>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Format:</span>
            <div className="text-blue-800 capitalize">{options.outputFormat}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span className={options.includeTimestamps ? 'text-green-700' : 'text-gray-500'}>
              Timestamps {options.includeTimestamps ? 'included' : 'excluded'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span className={options.includeSpeakers ? 'text-green-700' : 'text-gray-500'}>
              Speakers {options.includeSpeakers ? 'included' : 'excluded'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingOptions;