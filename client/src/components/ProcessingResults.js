import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Eye, 
  EyeOff, 
  BarChart3, 
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { lifelogService } from '../services/lifelogService';
import JSZip from 'jszip';

const ProcessingResults = ({ results, onClear }) => {
  const [showFullContent, setShowFullContent] = useState(false);
  const [activeTab, setActiveTab] = useState('output');

  // Handle different result types
  const isConsolidatedExport = results.exportType === 'consolidated';
  const displayContent = isConsolidatedExport ? results.content : results.output;

  // Multi-file export functionality
  const handleMultiFileExport = async () => {
    try {
      const response = await lifelogService.multiFileExport(results.date, {
        timezone: results.timezone,
        maxTokens: results.metadata?.settings?.maxTokens || 8000,
        includeTimestamps: results.metadata?.settings?.includeTimestamps !== false,
        includeSpeakers: results.metadata?.settings?.includeSpeakers !== false,
        summarizeLevel: 'low' // Full content for memory building
      });

      // Create and download zip file with all parts
      const zip = new JSZip();
      
      // Add index file
      zip.file(response.indexFile.filename, response.indexFile.content);
      
      // Add all part files
      response.files.forEach(file => {
        zip.file(file.filename, file.content);
      });

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lifelog_${response.date}_multifile.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Created ${response.totalFiles} files for ChatGPT upload!`);
    } catch (error) {
      toast.error(`Multi-file export failed: ${error.message}`);
    }
  };

  if (!results) return null;

  const handleCopyToClipboard = async () => {
    const content = typeof displayContent === 'string' 
      ? displayContent 
      : JSON.stringify(displayContent, null, 2);
    
    const success = await lifelogService.copyToClipboard(content);
    if (success) {
      toast.success('Content copied to clipboard!');
    } else {
      toast.error('Failed to copy content');
    }
  };

  const handleDownload = () => {
    const content = typeof displayContent === 'string' 
      ? displayContent 
      : JSON.stringify(displayContent, null, 2);
    
    const extension = results.metadata?.settings?.outputFormat === 'json' ? 'json' : 
                     results.metadata?.settings?.outputFormat === 'markdown' ? 'md' : 'txt';
    
    const filename = isConsolidatedExport 
      ? `lifelog-${results.date}-consolidated.${extension}`
      : `lifelog-${results.date}.${extension}`;
    
    let mimeType;
    switch (extension) {
      case 'json':
        mimeType = 'application/json';
        break;
      case 'md':
      case 'markdown':
        mimeType = 'text/markdown';
        break;
      default:
        mimeType = 'text/plain';
    }
    
    lifelogService.downloadAsFile(content, filename, mimeType);
    toast.success('File downloaded successfully!');
  };

  const formatTokenCount = (count) => {
    return count ? count.toLocaleString() : '0';
  };

  const getCompressionColor = (ratio) => {
    if (ratio >= 50) return 'text-green-600';
    if (ratio >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderContent = () => {
    const content = typeof displayContent === 'string' 
      ? displayContent 
      : JSON.stringify(displayContent, null, 2);
    
    const truncatedContent = showFullContent ? content : content.substring(0, 2000);
    const isTruncated = content.length > 2000 && !showFullContent;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Processed Content</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
            >
              {showFullContent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showFullContent ? 'Show Less' : 'Show All'}</span>
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700"
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-gray-100 text-sm whitespace-pre-wrap font-mono">
            {truncatedContent}
            {isTruncated && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowFullContent(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ... Show remaining {(content.length - 2000).toLocaleString()} characters
                </button>
              </div>
            )}
          </pre>
        </div>

        {content.length > 10000 && (
          <div className="text-xs text-gray-500 text-center">
            Large content detected. Consider downloading for better viewing experience.
          </div>
        )}
      </div>
    );
  };

  const renderStats = () => {
    const stats = lifelogService.getProcessingStats(results);
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Processing Statistics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Original Entries</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {results.originalCount || results.metadata?.originalEntries || 0}
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Processed</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {results.processedCount || results.metadata?.originalEntries || 0}
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Token Count</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatTokenCount(results.tokenCount)}
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Compression</span>
            </div>
            <div className={`text-2xl font-bold ${getCompressionColor(stats?.compressionRatio || 0)}`}>
              {stats?.compressionRatio || 0}%
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Processing Details</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{results.date}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Timezone:</span>
                <span className="font-medium">{results.timezone}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Output Format:</span>
                <span className="font-medium capitalize">
                  {results.metadata?.settings?.outputFormat || 'markdown'}
                </span>
              </div>
              {isConsolidatedExport && results.strategy && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Strategy:</span>
                  <span className="font-medium capitalize">{results.strategy}</span>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Max Tokens:</span>
                <span className="font-medium">
                  {formatTokenCount(results.metadata?.settings?.maxTokens)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Summarization:</span>
                <span className="font-medium capitalize">
                  {results.metadata?.settings?.summarizeLevel || 'medium'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Processing Time:</span>
                <span className="font-medium">
                  {results.metadata?.processingTime 
                    ? new Date(results.metadata.processingTime).toLocaleTimeString()
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
          
          {/* Topics for Consolidated Export */}
          {isConsolidatedExport && results.topics && results.topics.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">Topics Covered</h5>
              <div className="flex flex-wrap gap-2">
                {results.topics.map((topic, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Optimization Tips */}
        {results.tokenCount > (results.metadata?.settings?.maxTokens * 0.9) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Optimization Suggestion</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  The processed content is close to your token limit. Consider:
                </p>
                <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside space-y-1">
                  <li>Increasing the summarization level to "High"</li>
                  <li>Excluding timestamps or speaker names if not needed</li>
                  <li>Using a higher token limit if your model supports it</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Processing Complete</h2>
        </div>
        <button
          onClick={onClear}
          className="btn-secondary"
        >
          Clear Results
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('output')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'output'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Output</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Statistics</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'output' && renderContent()}
        {activeTab === 'stats' && renderStats()}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleCopyToClipboard}
          className="btn-primary flex items-center space-x-2"
        >
          <Copy className="h-4 w-4" />
          <span>Copy to Clipboard</span>
        </button>
        <button
          onClick={handleDownload}
          className="btn-secondary flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Download File</span>
        </button>
        
        {isConsolidatedExport ? (
          <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-md border border-green-200">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Ready for ChatGPT! Single file optimized for memory integration.</span>
          </div>
        ) : (
          <button
            onClick={handleMultiFileExport}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Multi-File for ChatGPT</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProcessingResults;