const { encodingForModel } = require('js-tiktoken');

class TokenOptimizer {
  constructor() {
    // Initialize tokenizer for GPT models
    this.encoder = encodingForModel('gpt-4');
    
    // Token limits for different models
    this.modelLimits = {
      'gpt-3.5-turbo': 4096,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000
    };

    // Stop words for content optimization
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'must', 'ought'
    ]);
  }

  /**
   * Count tokens in text
   * @param {string} text - Text to count tokens for
   * @returns {number} Token count
   */
  countTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    try {
      return this.encoder.encode(text).length;
    } catch (error) {
      // Fallback estimation: ~4 characters per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Optimize lifelogs for ChatGPT consumption
   * @param {Array} lifelogs - Array of lifelog entries
   * @param {object} options - Optimization options
   * @returns {object} Optimized data structure
   */
  async optimizeForChatGPT(lifelogs, options = {}) {
    const {
      maxTokens = 8000,
      includeTimestamps = true,
      includeSpeakers = true,
      chunkStrategy = 'semantic', // 'fixed', 'semantic', 'temporal'
    } = options;

    // Extract and clean content
    const cleanedContent = this.extractAndCleanContent(lifelogs, {
      includeTimestamps,
      includeSpeakers,
    });

    // Calculate total tokens
    const totalTokens = this.countTokens(cleanedContent.fullText);

    if (totalTokens <= maxTokens) {
      // Content fits within limits
      return {
        strategy: 'complete',
        tokenCount: totalTokens,
        content: cleanedContent.fullText,
        metadata: cleanedContent.metadata,
        chunks: null
      };
    }

    // Content needs optimization
    let optimizedResult;

    switch (chunkStrategy) {
      case 'semantic':
        optimizedResult = await this.semanticChunking(cleanedContent, maxTokens, options);
        break;
      case 'temporal':
        optimizedResult = await this.temporalChunking(cleanedContent, maxTokens, options);
        break;
      case 'fixed':
      default:
        optimizedResult = await this.fixedChunking(cleanedContent, maxTokens);
        break;
    }

    return {
      strategy: chunkStrategy,
      originalTokens: totalTokens,
      optimizedTokens: optimizedResult.totalTokens,
      compressionRatio: (totalTokens - optimizedResult.totalTokens) / totalTokens,
      chunks: optimizedResult.chunks,
      metadata: cleanedContent.metadata
    };
  }

  /**
   * Extract and clean content from lifelogs
   * @param {Array} lifelogs - Raw lifelog data
   * @param {object} options - Processing options
   * @returns {object} Cleaned content structure
   */
  extractAndCleanContent(lifelogs, options) {
    const {
      includeTimestamps,
      includeSpeakers,
    } = options;

    let fullText = '';
    const metadata = {
      totalEntries: lifelogs.length,
      dateRange: this.getDateRange(lifelogs),
      speakers: new Set(),
      topics: [],
      starredCount: 0,
      totalDuration: 0
    };

    // Process each lifelog entry
    for (const lifelog of lifelogs) {
      let entryText = '';

      // Add timestamp if requested
      if (includeTimestamps && lifelog.startTime) {
        const timestamp = new Date(lifelog.startTime).toLocaleString();
        entryText += `[${timestamp}] `;
      }

      // Add title/topic
      if (lifelog.title) {
        entryText += `## ${lifelog.title}\n\n`;
        metadata.topics.push(lifelog.title);
      }

      // Process content based on summarization level
      if (lifelog.markdown) {
        const processedContent = this.processContentBySummarizeLevel(
          lifelog.markdown, 
          includeSpeakers
        );
        entryText += processedContent + '\n\n';
      }

      // Extract speakers
      if (lifelog.contents) {
        this.extractSpeakersFromContent(lifelog.contents, metadata.speakers);
      }

      // Track metadata
      if (lifelog.isStarred) metadata.starredCount++;
      if (lifelog.startTime && lifelog.endTime) {
        const duration = (new Date(lifelog.endTime) - new Date(lifelog.startTime)) / (1000 * 60);
        metadata.totalDuration += duration;
      }

      fullText += entryText;
    }

    // Convert speakers set to array
    metadata.speakers = Array.from(metadata.speakers);

    return {
      fullText: fullText.trim(),
      metadata
    };
  }

  /**
   * Process content based on summarization level
   * @param {string} content - Raw content
   * @param {string} level - Summarization level
   * @param {boolean} includeSpeakers - Whether to include speaker info
   * @returns {string} Processed content
   */
  processContentBySummarizeLevel(content, level, includeSpeakers) {
    if (!content) return '';

    switch (level) {
      case 'high':
        return this.aggressiveSummarize(content, includeSpeakers);
      case 'medium':
        return this.moderateSummarize(content, includeSpeakers);
      case 'low':
      default:
        return this.lightSummarize(content, includeSpeakers);
    }
  }

  /**
   * Light summarization - remove redundancy, keep most content
   * @param {string} content - Content to summarize
   * @param {boolean} includeSpeakers - Include speaker information
   * @returns {string} Lightly summarized content
   */
  lightSummarize(content, includeSpeakers) {
    let processed = content;

    // Remove excessive whitespace
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove filler words in conversations if not including speakers
    if (!includeSpeakers) {
      processed = processed.replace(/\[.*?\]:\s*/g, '');
    }

    // Remove very short utterances (less than 3 words)
    processed = processed.replace(/^.{1,15}$/gm, '');

    return processed.trim();
  }

  /**
   * Moderate summarization - significant content reduction
   * @param {string} content - Content to summarize
   * @param {boolean} includeSpeakers - Include speaker information
   * @returns {string} Moderately summarized content
   */
  moderateSummarize(content, includeSpeakers) {
    let processed = this.lightSummarize(content, includeSpeakers);

    // Extract key sentences (longer sentences likely contain more information)
    const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Keep sentences that contain important keywords
    const importantKeywords = [
      'decided', 'important', 'meeting', 'project', 'deadline', 'goal',
      'problem', 'solution', 'action', 'next', 'follow', 'complete',
      'urgent', 'priority', 'schedule', 'appointment', 'reminder'
    ];

    const keySentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return importantKeywords.some(keyword => lowerSentence.includes(keyword)) ||
             sentence.length > 50; // Keep longer, more detailed sentences
    });

    // If we filtered too much, keep top 70% of sentences by length
    if (keySentences.length < sentences.length * 0.3) {
      const sortedSentences = sentences.sort((a, b) => b.length - a.length);
      return sortedSentences.slice(0, Math.ceil(sentences.length * 0.7)).join('. ') + '.';
    }

    return keySentences.join('. ') + '.';
  }

  /**
   * Aggressive summarization - maximum content reduction
   * @param {string} content - Content to summarize
   * @param {boolean} includeSpeakers - Include speaker information
   * @returns {string} Aggressively summarized content
   */
  aggressiveSummarize(content, includeSpeakers) {
    let processed = this.moderateSummarize(content, includeSpeakers);

    // Extract only the most important sentences
    const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 30);
    
    // Priority keywords for aggressive filtering
    const highPriorityKeywords = [
      'decided', 'concluded', 'agreed', 'action', 'next steps', 'deadline',
      'important', 'urgent', 'priority', 'meeting', 'appointment', 'schedule'
    ];

    const criticalSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return highPriorityKeywords.some(keyword => lowerSentence.includes(keyword));
    });

    // If no critical sentences found, keep the longest sentences (most informative)
    if (criticalSentences.length === 0) {
      const sortedSentences = sentences.sort((a, b) => b.length - a.length);
      return sortedSentences.slice(0, Math.min(3, sentences.length)).join('. ') + '.';
    }

    return criticalSentences.join('. ') + '.';
  }

  /**
   * Fixed-size chunking strategy
   * @param {object} cleanedContent - Cleaned content structure
   * @param {number} maxTokens - Maximum tokens per chunk
   * @param {object} options - Additional options
   * @returns {object} Chunked result
   */
  async fixedChunking(cleanedContent, maxTokens) {
    const { fullText } = cleanedContent;
    const chunks = [];
    const chunkSize = Math.floor(maxTokens * 0.9); // Leave some buffer
    
    // Split text into sentences for better chunk boundaries
    const sentences = fullText.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      const tokenCount = this.countTokens(testChunk);

      if (tokenCount <= chunkSize) {
        currentChunk = testChunk;
      } else {
        // Save current chunk and start new one
        if (currentChunk) {
          chunks.push({
            index: chunkIndex++,
            content: currentChunk.trim(),
            tokenCount: this.countTokens(currentChunk),
            type: 'fixed'
          });
        }
        currentChunk = sentence;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        index: chunkIndex,
        content: currentChunk.trim(),
        tokenCount: this.countTokens(currentChunk),
        type: 'fixed'
      });
    }

    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

    return { chunks, totalTokens };
  }

  /**
   * Semantic chunking strategy - group related content
   * @param {object} cleanedContent - Cleaned content structure
   * @param {number} maxTokens - Maximum tokens per chunk
   * @param {object} options - Additional options
   * @returns {object} Chunked result
   */
  async semanticChunking(cleanedContent, maxTokens) {
    const { fullText } = cleanedContent;
    const chunks = [];
    
    // Split by topics/headings first
    const sections = fullText.split(/(?=##\s)/);
    let currentChunk = '';
    let chunkIndex = 0;
    const chunkSize = Math.floor(maxTokens * 0.9);

    for (const section of sections) {
      const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + section;
      const tokenCount = this.countTokens(testChunk);

      if (tokenCount <= chunkSize) {
        currentChunk = testChunk;
      } else {
        // Save current chunk
        if (currentChunk) {
          chunks.push({
            index: chunkIndex++,
            content: currentChunk.trim(),
            tokenCount: this.countTokens(currentChunk),
            type: 'semantic',
            topics: this.extractTopicsFromText(currentChunk)
          });
        }

        // If single section is too large, split it further
        if (this.countTokens(section) > chunkSize) {
          const subChunks = await this.fixedChunking({ fullText: section }, maxTokens);
          for (const subChunk of subChunks.chunks) {
            chunks.push({
              ...subChunk,
              index: chunkIndex++,
              type: 'semantic-split'
            });
          }
          currentChunk = '';
        } else {
          currentChunk = section;
        }
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        index: chunkIndex,
        content: currentChunk.trim(),
        tokenCount: this.countTokens(currentChunk),
        type: 'semantic',
        topics: this.extractTopicsFromText(currentChunk)
      });
    }

    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

    return { chunks, totalTokens };
  }

  /**
   * Temporal chunking strategy - group by time periods
   * @param {object} cleanedContent - Cleaned content structure
   * @param {number} maxTokens - Maximum tokens per chunk
   * @param {object} options - Additional options
   * @returns {object} Chunked result
   */
  async temporalChunking(cleanedContent, maxTokens, options) {
    // For now, use semantic chunking as temporal requires more complex timestamp parsing
    // This could be enhanced to group content by time periods (morning, afternoon, evening)
    return await this.semanticChunking(cleanedContent, maxTokens, options);
  }

  /**
   * Create consolidated export optimized for ChatGPT memory integration
   * @param {Array} lifelogs - Array of lifelog entries
   * @param {object} options - Export options
   * @returns {object} Consolidated content structure
   */
  async createConsolidatedExport(lifelogs, options = {}) {
    const {
      maxTokens = 120000,
      includeTimestamps = true,
      includeSpeakers = true,
      prioritizeTopics = true
    } = options;

    // Group lifelogs by topics and importance
    const groupedContent = this.groupByTopicsAndImportance(lifelogs, {
      includeTimestamps,
      includeSpeakers,
      prioritizeTopics
    });

    // Create consolidated content with intelligent summarization
    let consolidatedContent = '';
    let totalTokens = 0;
    const topics = [];

    // Add high-priority content first
    if (groupedContent.highPriority.length > 0) {
      consolidatedContent += '## Key Activities & Important Conversations\n\n';
      for (const item of groupedContent.highPriority) {
        const itemContent = this.formatLifelogEntry(item, { includeTimestamps, includeSpeakers });
        const itemTokens = this.countTokens(itemContent);
        
        if (totalTokens + itemTokens <= maxTokens * 0.85) { // Reserve 85% for high priority
          consolidatedContent += itemContent + '\n\n';
          totalTokens += itemTokens;
          if (item.topics) topics.push(...item.topics);
        }
      }
    }

    // Add medium-priority content
    if (groupedContent.mediumPriority.length > 0 && totalTokens < maxTokens * 0.95) {
      consolidatedContent += '## Regular Activities & Conversations\n\n';
      for (const item of groupedContent.mediumPriority) {
        const itemContent = this.formatLifelogEntry(item, { includeTimestamps, includeSpeakers });
        const itemTokens = this.countTokens(itemContent);
        
        if (totalTokens + itemTokens <= maxTokens * 0.95) {
          consolidatedContent += itemContent + '\n\n';
          totalTokens += itemTokens;
          if (item.topics) topics.push(...item.topics);
        }
      }
    }

    // Add low-priority content if space remains
    if (groupedContent.lowPriority.length > 0 && totalTokens < maxTokens * 0.98) {
      consolidatedContent += '## Background Activities\n\n';
      for (const item of groupedContent.lowPriority) {
        const itemContent = this.formatLifelogEntry(item, { includeTimestamps, includeSpeakers, summarize: true });
        const itemTokens = this.countTokens(itemContent);
        
        if (totalTokens + itemTokens <= maxTokens * 0.98) {
          consolidatedContent += itemContent + '\n\n';
          totalTokens += itemTokens;
        }
      }
    }

    // Add summary if content was truncated
    if (totalTokens >= maxTokens * 0.95) {
      const remainingEntries = lifelogs.length - this.countProcessedEntries(groupedContent);
      if (remainingEntries > 0) {
        consolidatedContent += `\n## Summary\n\n`;
        consolidatedContent += `Note: ${remainingEntries} additional entries were summarized due to token limits. `;
        consolidatedContent += `These included routine activities and brief interactions.\n\n`;
      }
    }

    return {
      content: consolidatedContent,
      tokenCount: totalTokens,
      strategy: totalTokens <= maxTokens ? 'consolidated' : 'prioritized',
      topics: [...new Set(topics)], // Remove duplicates
      originalEntries: lifelogs.length
    };
  }

  /**
   * Extract text content from a lifelog entry
   * @param {object} lifelog - Lifelog entry
   * @returns {string} Extracted text content
   */
  extractTextContent(lifelog) {
    let content = '';
    
    // Add title if available
    if (lifelog.title) {
      content += lifelog.title + ' ';
    }
    
    // Add markdown content if available
    if (lifelog.markdown) {
      content += lifelog.markdown + ' ';
    }
    
    // Add any other text fields that might exist
    if (lifelog.content) {
      content += lifelog.content + ' ';
    }
    
    return content.trim();
  }

  /**
   * Format a lifelog entry for output
   * @param {object} lifelog - Lifelog entry
   * @param {object} options - Formatting options
   * @returns {string} Formatted lifelog entry
   */
  formatLifelogEntry(lifelog, options = {}) {
    const { includeTimestamps = false, includeSpeakers = false, summarize = false } = options;
    let entryText = '';

    // Add timestamp if requested
    if (includeTimestamps && lifelog.startTime) {
      const timestamp = new Date(lifelog.startTime).toLocaleString();
      entryText += `[${timestamp}] `;
    }

    // Add title/topic
    if (lifelog.title) {
      entryText += `## ${lifelog.title}\n\n`;
    }

    // Process content based on summarization level
    if (lifelog.markdown) {
      const processedContent = summarize 
        ? this.lightSummarize(lifelog.markdown, includeSpeakers)
        : lifelog.markdown;
      entryText += processedContent + '\n\n';
    }

    return entryText.trim();
  }

  /**
   * Extract and clean content from lifelogs
   * @param {Array} lifelogs - Array of lifelog entries
   * @param {object} options - Processing options
   * @returns {object} Cleaned content with metadata
   */

  /**
   * Group lifelogs by topics and importance for better organization
   * @param {Array} lifelogs - Array of lifelog entries
   * @param {object} options - Grouping options
   * @returns {object} Grouped content structure
   */
  groupByTopicsAndImportance(lifelogs) {
    const highPriority = [];
    const mediumPriority = [];
    const lowPriority = [];

    // Keywords that indicate high importance
    const highImportanceKeywords = [
      'meeting', 'call', 'interview', 'presentation', 'decision', 'important',
      'urgent', 'deadline', 'project', 'client', 'boss', 'manager', 'team',
      'problem', 'issue', 'solution', 'plan', 'strategy', 'goal', 'target'
    ];

    // Keywords that indicate medium importance
    const mediumImportanceKeywords = [
      'discussion', 'conversation', 'email', 'message', 'update', 'review',
      'feedback', 'idea', 'suggestion', 'question', 'answer', 'explain'
    ];

    for (const lifelog of lifelogs) {
      const content = this.extractTextContent(lifelog).toLowerCase();
      const wordCount = content.split(' ').length;
      
      // Determine priority based on content analysis
      let priority = 'low';
      
      if (wordCount > 50 || this.containsKeywords(content, highImportanceKeywords)) {
        priority = 'high';
      } else if (wordCount > 20 || this.containsKeywords(content, mediumImportanceKeywords)) {
        priority = 'medium';
      }

      // Add topic extraction
      const topics = this.extractTopics(content);
      const enrichedLifelog = { ...lifelog, topics, priority, wordCount };

      switch (priority) {
        case 'high':
          highPriority.push(enrichedLifelog);
          break;
        case 'medium':
          mediumPriority.push(enrichedLifelog);
          break;
        default:
          lowPriority.push(enrichedLifelog);
      }
    }

    // Sort by timestamp within each priority group
    const sortByTime = (a, b) => new Date(a.timestamp) - new Date(b.timestamp);
    
    return {
      highPriority: highPriority.sort(sortByTime),
      mediumPriority: mediumPriority.sort(sortByTime),
      lowPriority: lowPriority.sort(sortByTime)
    };
  }

  /**
   * Extract topics from content using simple keyword analysis
   * @param {string} content - Text content to analyze
   * @returns {Array} Array of detected topics
   */
  extractTopics(content) {
    const topicKeywords = {
      'work': ['work', 'job', 'office', 'meeting', 'project', 'client', 'business'],
      'personal': ['family', 'friend', 'personal', 'home', 'weekend'],
      'health': ['health', 'doctor', 'exercise', 'gym', 'medical', 'wellness'],
      'technology': ['computer', 'software', 'app', 'website', 'tech', 'digital'],
      'travel': ['travel', 'trip', 'flight', 'hotel', 'vacation', 'visit'],
      'food': ['food', 'restaurant', 'eat', 'lunch', 'dinner', 'cook'],
      'entertainment': ['movie', 'music', 'game', 'show', 'entertainment', 'fun']
    };

    const detectedTopics = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (this.containsKeywords(content, keywords)) {
        detectedTopics.push(topic);
      }
    }

    return detectedTopics;
  }

  /**
   * Check if content contains any of the specified keywords
   * @param {string} content - Text content to check
   * @param {Array} keywords - Array of keywords to look for
   * @returns {boolean} True if any keyword is found
   */
  containsKeywords(content, keywords) {
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Count how many entries were processed within token limits
   * @param {object} groupedContent - Grouped content structure
   * @param {number} maxTokens - Maximum token limit
   * @returns {number} Number of processed entries
   */
  countProcessedEntries(groupedContent) {
    // This is a simplified count - in practice, we'd track this during processing
    return groupedContent.highPriority.length + 
           Math.floor(groupedContent.mediumPriority.length * 0.8) +
           Math.floor(groupedContent.lowPriority.length * 0.3);
  }

  /**
   * Format optimized data as Markdown
   * @param {object} optimizedData - Optimized data structure
   * @returns {string} Formatted Markdown
   */
  formatAsMarkdown(optimizedData) {
    if (optimizedData.strategy === 'complete') {
      return `# Daily Lifelog Summary\n\n${optimizedData.content}`;
    }

    let markdown = `# Daily Lifelog Summary\n\n`;
    markdown += `**Processing Strategy:** ${optimizedData.strategy}\n`;
    markdown += `**Token Optimization:** ${optimizedData.originalTokens} → ${optimizedData.optimizedTokens} tokens\n`;
    markdown += `**Compression Ratio:** ${(optimizedData.compressionRatio * 100).toFixed(1)}%\n\n`;

    if (optimizedData.metadata) {
      markdown += `## Metadata\n`;
      markdown += `- **Total Entries:** ${optimizedData.metadata.totalEntries}\n`;
      markdown += `- **Date Range:** ${optimizedData.metadata.dateRange}\n`;
      markdown += `- **Speakers:** ${optimizedData.metadata.speakers.join(', ')}\n`;
      markdown += `- **Starred Entries:** ${optimizedData.metadata.starredCount}\n`;
      markdown += `- **Total Duration:** ${Math.round(optimizedData.metadata.totalDuration)} minutes\n\n`;
    }

    if (optimizedData.chunks) {
      markdown += `## Content Chunks (${optimizedData.chunks.length})\n\n`;
      
      for (const chunk of optimizedData.chunks) {
        markdown += `### Chunk ${chunk.index + 1} (${chunk.tokenCount} tokens)\n\n`;
        markdown += `${chunk.content}\n\n---\n\n`;
      }
    }

    return markdown;
  }

  /**
   * Format optimized data as plain text
   * @param {object} optimizedData - Optimized data structure
   * @returns {string} Formatted plain text
   */
  formatAsPlainText(optimizedData) {
    if (optimizedData.strategy === 'complete') {
      return optimizedData.content;
    }

    let text = '';
    if (optimizedData.chunks) {
      text = optimizedData.chunks.map(chunk => chunk.content).join('\n\n');
    }

    return text;
  }

  /**
   * Extract date range from lifelogs
   * @param {Array} lifelogs - Lifelog entries
   * @returns {string} Date range string
   */
  getDateRange(lifelogs) {
    if (!lifelogs || lifelogs.length === 0) return 'No data';

    const dates = lifelogs
      .map(log => log.startTime)
      .filter(time => time)
      .map(time => new Date(time).toDateString())
      .sort();

    if (dates.length === 0) return 'No dates';
    if (dates.length === 1) return dates[0];

    return `${dates[0]} - ${dates[dates.length - 1]}`;
  }

  /**
   * Extract speakers from content nodes
   * @param {Array} contents - Content nodes
   * @param {Set} speakers - Set to collect speakers
   */
  extractSpeakersFromContent(contents, speakers) {
    if (!contents || !Array.isArray(contents)) return;

    for (const node of contents) {
      if (node.speakerName) {
        speakers.add(node.speakerName);
      }
      if (node.children) {
        this.extractSpeakersFromContent(node.children, speakers);
      }
    }
  }

  /**
   * Extract topics from text content
   * @param {string} text - Text content
   * @returns {Array} Array of topics
   */
  extractTopicsFromText(text) {
    const topics = [];
    const headingRegex = /^##\s+(.+)$/gm;
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
      topics.push(match[1].trim());
    }

    return topics;
  }
}

module.exports = TokenOptimizer;