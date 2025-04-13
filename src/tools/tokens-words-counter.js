// src/tools/tokens-words-counter.js
const BaseTool = require('./base-tool');
const path = require('path');
const util = require('util');
const fileCache = require('../cache/file-cache');
const appState = require('../../src/state.js');

/**
 * Creates a delay that won't completely freeze the UI
 * @param {number} seconds - Total seconds to delay
 * @param {function} progressCallback - Function to call with progress updates
 */
function gentleDelay(seconds, progressCallback) {
  return new Promise(resolve => {
    let secondsElapsed = 0;
    
    // Use setInterval for regular UI updates
    const interval = setInterval(() => {
      secondsElapsed++;
      
      if (progressCallback) {
        progressCallback(`Delay: ${secondsElapsed} seconds elapsed\n`);
      }
      
      if (secondsElapsed >= seconds) {
        clearInterval(interval);
        resolve();
      }
    }, 1000); // Update every second
  });
}

class TokensWordsCounter extends BaseTool {
  constructor(claudeService, config = {}) {
    super('tokens_words_counter', config);
    this.claudeService = claudeService;
    console.log('TokensWordsCounter initialized with config:', 
      util.inspect(config, { depth: 1, colors: true }));
  }
  
  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    console.log('Executing TokensWordsCounter with options:', options);
    
    // Clear the cache for this tool
    const toolName = 'tokens_words_counter';
    fileCache.clear(toolName);
    
    // Extract options
    const inputFile = options.input_file;
    const outputFiles = [];

    // Add a gentle delay that won't freeze the UI
    this.emitOutput("Starting a 15-second delay for testing...\n");
    // Use our gentler approach
    await gentleDelay(15, (message) => {
      this.emitOutput(message);
    });
    this.emitOutput("Delay complete!\n\n");

    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }
    
    try {
      // Read the input file
      console.log(`Reading file: ${inputFile}`);
      const text = await this.readInputFile(inputFile);
      console.log(`File read successfully, length: ${text.length} characters`);
      
      // Count words
      console.log('Counting words...');
      const wordCount = this.countWords(text);
      console.log(`Word count: ${wordCount}`);
      
      // Count tokens using Claude API
      console.log('Counting tokens using Claude API...');
      
      // First, output a message to the user
      this.emitOutput('Counting tokens using Claude API (this may take a few seconds)...\n');
      
      const promptTokens = await this.claudeService.countTokens(text);
      console.log(`Token count: ${promptTokens}`);
      
      // Calculate token metrics
      const contextWindow = this.config.context_window || 200000;
      const availableTokens = contextWindow - promptTokens;
      const wordsPerToken = promptTokens > 0 ? wordCount / promptTokens : 0;
      const thinkingBudget = this.config.thinking_budget_tokens || 32000;
      const desiredOutputTokens = this.config.desired_output_tokens || 12000;
      
      // Prepare report content
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const inputBase = path.basename(inputFile);
      const inputName = path.parse(inputBase).name;
      
      const reportContent = `Token and Word Count Report
=========================

Analysis of file: ${inputFile}
Generated on: ${new Date().toLocaleString()}

Word count: ${wordCount}
Token count: ${promptTokens}
Words per token ratio: ${wordsPerToken.toFixed(2)}

Context window: ${contextWindow} tokens
Available tokens: ${availableTokens} tokens
Thinking budget: ${thinkingBudget} tokens
Desired output tokens: ${desiredOutputTokens} tokens`;

      // Output the report to the console
      this.emitOutput('\n' + reportContent + '\n');
      
      // Save the report to a file
      const outputFileName = `count_${inputName}_${timestamp}.txt`;
      console.log(`Saving report to: ${path.join(saveDir, outputFileName)}`);
      
      const outputFile = await this.writeOutputFile(
        reportContent, 
        saveDir, 
        outputFileName
      );
      
      // Add to local tracking array
      outputFiles.push(outputFile);
      
      // Add to the shared file cache
      fileCache.addFile(toolName, outputFile);

      console.log('toolName=', toolName);
      console.log('outputFile=', outputFile);
      
      console.log('TokensWordsCounter execution complete');
      console.log('*** Files in cache:', fileCache.getFiles(toolName));
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          wordCount,
          tokenCount: promptTokens,
          wordsPerToken: wordsPerToken.toFixed(2),
          availableTokens
        }
      };
    } catch (error) {
      console.error('Error in TokensWordsCounter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Emit output to be displayed in the UI
   * @param {string} text - Text to emit
   */
  emitOutput(text) {
    // This will be overridden by the tool runner to send output to the UI
    console.log(text);
  }
}

module.exports = TokensWordsCounter;
