const TokenOptimizer = require('../src/services/TokenOptimizer');

describe('TokenOptimizer', () => {
  test('countTokens returns positive integer', () => {
    const optimizer = new TokenOptimizer();
    const count = optimizer.countTokens('Hello world');
    expect(count).toBeGreaterThan(0);
  });

  test('extractTopicsFromText finds headings', () => {
    const optimizer = new TokenOptimizer();
    const topics = optimizer.extractTopicsFromText('## Work\nDiscuss project');
    expect(topics).toContain('Work');
  });
});
