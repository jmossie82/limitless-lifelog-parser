const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Import modules
const LifelogProcessor = require('./src/services/LifelogProcessor');
const TokenOptimizer = require('./src/services/TokenOptimizer');
const DateUtils = require('./src/utils/DateUtils');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve React app
app.use(express.static(path.join(__dirname, 'client/build')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get available dates with lifelog data
app.get('/api/dates', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const processor = new LifelogProcessor(apiKey);
    const dates = await processor.getAvailableDates();
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching dates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get lifelogs for a specific date
app.get('/api/lifelogs/:date', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const { date } = req.params;
    const { timezone = 'UTC', format = 'raw' } = req.query;

    const processor = new LifelogProcessor(apiKey);
    const lifelogs = await processor.getLifelogsForDate(date, timezone);

    if (format === 'chatgpt') {
      const optimizer = new TokenOptimizer();
      const optimizedData = await optimizer.optimizeForChatGPT(lifelogs, {
        maxTokens: parseInt(req.query.maxTokens) || 8000,
        includeTimestamps: req.query.includeTimestamps !== 'false',
        includeSpeakers: req.query.includeSpeakers !== 'false',
        summarizeLevel: req.query.summarizeLevel || 'medium'
      });
      res.json(optimizedData);
    } else {
      res.json({ lifelogs, count: lifelogs.length });
    }
  } catch (error) {
    console.error('Error fetching lifelogs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process and export lifelogs for ChatGPT
app.post('/api/process', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const {
      date,
      timezone = 'UTC',
      maxTokens = 8000,
      includeTimestamps = true,
      includeSpeakers = true,
      summarizeLevel = 'medium',
      outputFormat = 'markdown'
    } = req.body;

    const processor = new LifelogProcessor(apiKey);
    const optimizer = new TokenOptimizer();

    // Fetch lifelogs
    const lifelogs = await processor.getLifelogsForDate(date, timezone);
    
    // Optimize for ChatGPT
    const optimizedData = await optimizer.optimizeForChatGPT(lifelogs, {
      maxTokens,
      includeTimestamps,
      includeSpeakers,
      summarizeLevel
    });

    // Format output
    let formattedOutput;
    if (outputFormat === 'markdown') {
      formattedOutput = optimizer.formatAsMarkdown(optimizedData);
    } else if (outputFormat === 'json') {
      formattedOutput = optimizedData;
    } else {
      formattedOutput = optimizer.formatAsPlainText(optimizedData);
    }

    res.json({
      success: true,
      date,
      timezone,
      originalCount: lifelogs.length,
      processedCount: optimizedData.chunks ? optimizedData.chunks.length : 1,
      tokenCount: optimizedData.tokenCount,
      output: formattedOutput,
      metadata: {
        processingTime: new Date().toISOString(),
        settings: {
          maxTokens,
          includeTimestamps,
          includeSpeakers,
          summarizeLevel,
          outputFormat
        }
      }
    });
  } catch (error) {
    console.error('Error processing lifelogs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multi-file export for ChatGPT memory building
app.post('/api/multi-file-export', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const {
      date,
      timezone = 'UTC',
      maxTokens = 8000,
      includeTimestamps = true,
      includeSpeakers = true,
      summarizeLevel = 'low'
    } = req.body;

    const processor = new LifelogProcessor(apiKey);
    const optimizer = new TokenOptimizer();

    // Fetch all lifelogs for the date
    const lifelogs = await processor.getLifelogsForDate(date, timezone);
    
    if (lifelogs.length === 0) {
      return res.status(404).json({ error: 'No lifelogs found for this date' });
    }

    // Process with minimal compression to preserve full content
    const optimizedData = await optimizer.optimizeForChatGPT(lifelogs, {
      maxTokens,
      includeTimestamps,
      includeSpeakers,
      summarizeLevel,
      chunkStrategy: 'semantic'
    });

    const files = [];
    const baseFilename = `lifelog_${date}`;

    if (optimizedData.strategy === 'complete') {
      // Single file if content fits within limits
      files.push({
        filename: `${baseFilename}_complete.md`,
        content: optimizer.formatAsMarkdown(optimizedData),
        tokenCount: optimizedData.tokenCount,
        partNumber: 1
      });
    } else {
      // Multiple files for chunked content
      optimizedData.chunks.forEach((chunk, index) => {
        const partNumber = index + 1;
        const filename = `${baseFilename}_part${partNumber.toString().padStart(2, '0')}.md`;
        
        let content = `# Lifelog ${date} - Part ${partNumber}\n\n`;
        content += `**Token Count:** ${chunk.tokenCount}\n`;
        content += `**Chunk Type:** ${chunk.type}\n`;
        if (chunk.topics && chunk.topics.length > 0) {
          content += `**Topics:** ${chunk.topics.join(', ')}\n`;
        }
        content += `**Part ${partNumber} of ${optimizedData.chunks.length}**\n\n`;
        content += `---\n\n${chunk.content}`;

        files.push({
          filename,
          content,
          tokenCount: chunk.tokenCount,
          partNumber,
          topics: chunk.topics || []
        });
      });
    }

    // Create index file with overview
    const indexContent = `# Lifelog Index - ${date}\n\n` +
      `**Date:** ${date}\n` +
      `**Timezone:** ${timezone}\n` +
      `**Total Files:** ${files.length}\n` +
      `**Processing Strategy:** ${optimizedData.strategy}\n` +
      `**Total Token Count:** ${optimizedData.optimizedTokens || optimizedData.tokenCount}\n\n` +
      `## File Overview\n\n` +
      files.map(file => 
        `- **${file.filename}** (${file.tokenCount} tokens)${file.topics?.length ? ` - Topics: ${file.topics.join(', ')}` : ''}`
      ).join('\n') + '\n\n' +
      `## Usage Instructions\n\n` +
      `1. Upload files to ChatGPT in order (part01, part02, etc.)\n` +
      `2. Each file is optimized to fit within token limits\n` +
      `3. Files contain your complete lifelog data for ${date}\n` +
      `4. Use these for building consistent memory in ChatGPT\n\n` +
      `---\n*Generated by Limitless Lifelog Parser*`;

    const indexFile = {
      filename: `${baseFilename}_INDEX.md`,
      content: indexContent
    };

    res.json({
      success: true,
      date,
      timezone,
      totalFiles: files.length + 1,
      strategy: optimizedData.strategy,
      totalTokens: optimizedData.optimizedTokens || optimizedData.tokenCount,
      indexFile,
      files,
      metadata: {
        originalEntries: lifelogs.length,
        processingTime: new Date().toISOString(),
        settings: {
          maxTokens,
          includeTimestamps,
          includeSpeakers,
          summarizeLevel
        }
      }
    });
  } catch (error) {
    console.error('Error in multi-file export:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add consolidated export endpoint for better ChatGPT integration
app.post('/api/consolidated-export', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const {
      date,
      timezone = 'UTC',
      maxTokens = 120000, // Higher limit for consolidated export
      includeTimestamps = true,
      includeSpeakers = true,
      summarizeLevel = 'low',
      prioritizeTopics = true
    } = req.body;

    const processor = new LifelogProcessor(apiKey);
    const optimizer = new TokenOptimizer();

    // Fetch all lifelogs for the date
    const lifelogs = await processor.getLifelogsForDate(date, timezone);
    
    if (lifelogs.length === 0) {
      return res.status(404).json({ error: 'No lifelogs found for this date' });
    }

    // Create consolidated content optimized for ChatGPT memory
    const consolidatedContent = await optimizer.createConsolidatedExport(lifelogs, {
      maxTokens,
      includeTimestamps,
      includeSpeakers,
      summarizeLevel,
      prioritizeTopics
    });

    const filename = `lifelog_${date}_consolidated.md`;
    
    // Add ChatGPT-specific instructions
    let content = `# Lifelog Memory Integration - ${date}\n\n`;
    content += `**Instructions for ChatGPT Memory Building:**\n`;
    content += `- This is a consolidated lifelog from ${date}\n`;
    content += `- Contains ${lifelogs.length} lifelog entries optimized for memory integration\n`;
    content += `- Key topics and conversations are prioritized and organized\n`;
    content += `- Use this to build consistent memory about the user's activities and context\n\n`;
    content += `**Processing Details:**\n`;
    content += `- Date: ${date}\n`;
    content += `- Timezone: ${timezone}\n`;
    content += `- Token Count: ${consolidatedContent.tokenCount}\n`;
    content += `- Optimization Strategy: ${consolidatedContent.strategy}\n`;
    content += `- Topics Covered: ${consolidatedContent.topics ? consolidatedContent.topics.join(', ') : 'Various'}\n\n`;
    content += `---\n\n${consolidatedContent.content}`;

    res.json({
      success: true,
      date,
      timezone,
      filename,
      content,
      tokenCount: consolidatedContent.tokenCount,
      strategy: consolidatedContent.strategy,
      topics: consolidatedContent.topics || [],
      metadata: {
        originalEntries: lifelogs.length,
        processingTime: new Date().toISOString(),
        settings: {
          maxTokens,
          includeTimestamps,
          includeSpeakers,
          summarizeLevel,
          prioritizeTopics
        }
      }
    });
  } catch (error) {
    console.error('Error in consolidated export:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch process multiple dates
app.post('/api/batch-process', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const {
      startDate,
      endDate,
      timezone = 'UTC',
      maxTokensPerDay = 8000,
      outputFormat = 'markdown'
    } = req.body;

    const processor = new LifelogProcessor(apiKey);
    const optimizer = new TokenOptimizer();
    const dateUtils = new DateUtils();

    const dates = dateUtils.getDateRange(startDate, endDate);
    const results = [];

    for (const date of dates) {
      try {
        const lifelogs = await processor.getLifelogsForDate(date, timezone);
        if (lifelogs.length > 0) {
          const optimizedData = await optimizer.optimizeForChatGPT(lifelogs, {
            maxTokens: maxTokensPerDay
          });

          let formattedOutput;
          if (outputFormat === 'markdown') {
            formattedOutput = optimizer.formatAsMarkdown(optimizedData);
          } else {
            formattedOutput = optimizedData;
          }

          results.push({
            date,
            success: true,
            count: lifelogs.length,
            tokenCount: optimizedData.tokenCount,
            output: formattedOutput
          });
        }
      } catch (error) {
        results.push({
          date,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      dateRange: { startDate, endDate },
      processedDates: results.length,
      results
    });
  } catch (error) {
    console.error('Error batch processing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Limitless Lifelog Parser server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

module.exports = app;