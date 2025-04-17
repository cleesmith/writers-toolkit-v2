// src/tools/template-tool.js
const BaseTool = require('./base-tool');
const path = require('path');
const fileCache = require('../cache/file-cache');
const appState = require('../state.js');
const fs = require('fs/promises');
const promptLoader = require('../utils/prompt-loader');

/**
 * TemplateTool
 * A template class that can be used as a starting point for any tool in the system.
 * This demonstrates standard patterns and best practices for implementing a Writer's Toolkit tool.
 */
class TemplateTool extends BaseTool {
  /**
   * Constructor
   * @param {Object} claudeService - Claude API service
   * @param {Object} config - Tool configuration
   */
  constructor(claudeService, config = {}) {
    // The first parameter should be the tool's unique identifier
    super('template_tool', config);
    this.claudeService = claudeService;
    
    // Tool-specific settings with defaults that can be overridden by config
    this.toolSettings = {
      // Common settings
      requiresOutline: config.requiresOutline || false,
      requiresWorld: config.requiresWorld || false,
      requiresManuscript: config.requiresManuscript || true,
      
      // Tool-specific settings
      analysisLevel: config.analysisLevel || 'standard',
      customOption1: config.customOption1 || 'default value',
      customOption2: config.customOption2 || false
    };
  }
  
  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    console.log(`Executing ${this.name} with options:`, options);
    
    try {
      // Clear the file cache for this tool
      fileCache.clear(this.name);
      
      // Extract options with defaults
      const {
        manuscript_file: manuscriptFile,
        outline_file: outlineFile = null,
        world_file: worldFile = null,
        analysis_level: analysisLevel = this.toolSettings.analysisLevel,
        skip_thinking: skipThinking = false,
        analysis_description: analysisDescription = '',
        save_dir: saveDir = appState.CURRENT_PROJECT_PATH,
        
        // Add any tool-specific options here
        custom_option: customOption = ''
      } = options;
      
      // Validate save directory
      if (!saveDir) {
        throw new Error('No save directory specified and no current project selected');
      }
      
      // Ensure file paths are absolute
      const absolutePaths = {
        manuscript: this.ensureAbsolutePath(manuscriptFile, saveDir),
        outline: outlineFile ? this.ensureAbsolutePath(outlineFile, saveDir) : null,
        world: worldFile ? this.ensureAbsolutePath(worldFile, saveDir) : null
      };
      
      // Validate required files
      if (this.toolSettings.requiresManuscript && !absolutePaths.manuscript) {
        throw new Error('This tool requires a manuscript file');
      }
      
      if (this.toolSettings.requiresOutline && !absolutePaths.outline) {
        throw new Error('This tool requires an outline file');
      }
      
      if (this.toolSettings.requiresWorld && !absolutePaths.world) {
        throw new Error('This tool requires a world file');
      }
      
      // Log file paths for debugging
      this.logFilePaths(absolutePaths);
      
      // Read input files
      this.emitOutput(`Reading files...\n`);
      
      // Read manuscript file if required
      let manuscriptContent = '';
      if (absolutePaths.manuscript) {
        this.emitOutput(`Reading manuscript file: ${absolutePaths.manuscript}\n`);
        manuscriptContent = await this.readInputFile(absolutePaths.manuscript);
      }
      
      // Read outline file if provided
      let outlineContent = '';
      if (absolutePaths.outline) {
        this.emitOutput(`Reading outline file: ${absolutePaths.outline}\n`);
        outlineContent = await this.readInputFile(absolutePaths.outline);
      }
      
      // Read world file if provided
      let worldContent = '';
      if (absolutePaths.world) {
        this.emitOutput(`Reading world file: ${absolutePaths.world}\n`);
        worldContent = await this.readInputFile(absolutePaths.world);
      }
      
      // Load prompt template
      // The promptType parameter would vary by tool and could be determined by options
      const promptType = options.prompt_type || 'main';
      const promptTemplate = await promptLoader.getPrompt(this.name, promptType);
      
      if (!promptTemplate) {
        throw new Error(`No prompt template found for ${this.name}/${promptType}`);
      }
      
      // Create prompt by replacing placeholders
      const prompt = this.createPrompt({
        template: promptTemplate,
        manuscriptContent,
        outlineContent,
        worldContent,
        analysisLevel,
        customOption,
        // Add any other variables needed by the prompt
      });
      
      // Process with Claude API
      const result = await this.processWithClaude({
        prompt,
        skipThinking,
        saveDir
      });
      
      // Save the results
      const outputFiles = await this.saveResults({
        content: result.content,
        thinking: result.thinking,
        stats: result.stats,
        promptType,
        analysisLevel,
        saveDir,
        skipThinking,
        description: analysisDescription
      });
      
      // Register files with cache
      this.registerFilesWithCache(outputFiles);
      
      // Return success result
      return {
        success: true,
        outputFiles,
        stats: {
          ...result.stats,
          analysisLevel,
          customOption
        }
      };
      
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Log file paths for debugging
   * @param {Object} paths - File paths object
   */
  logFilePaths(paths) {
    console.log('Using full paths:');
    if (paths.manuscript) console.log(`Manuscript: ${paths.manuscript}`);
    if (paths.outline) console.log(`Outline: ${paths.outline}`);
    if (paths.world) console.log(`World: ${paths.world}`);
  }
  
  /**
   * Register files with the file cache
   * @param {Array} files - Array of file paths
   */
  registerFilesWithCache(files) {
    files.forEach(file => {
      fileCache.addFile(this.name, file);
    });
  }
  
  /**
   * Create prompt by replacing placeholders in template
   * @param {Object} params - Parameters containing content and variables
   * @returns {string} - Complete prompt for Claude API
   */
  createPrompt({ 
    template, 
    manuscriptContent = '', 
    outlineContent = '', 
    worldContent = '',
    analysisLevel = 'standard',
    customOption = '',
    // Add other variables as needed
  }) {
    // No markdown instruction that's common to many prompts
    const noMarkdown = "IMPORTANT: - NO Markdown formatting";
    
    // Replace placeholders with actual content
    return template
      .replace(/<manuscript><\/manuscript>/g, manuscriptContent)
      .replace(/<outline><\/outline>/g, outlineContent)
      .replace(/<world><\/world>/g, worldContent)
      .replace(/<no-markdown><\/no-markdown>/g, noMarkdown)
      .replace(/<analysis-level><\/analysis-level>/g, analysisLevel)
      .replace(/<custom-option><\/custom-option>/g, customOption);
    
    // Add any other replacements specific to this tool
  }
  
  /**
   * Process the prompt with Claude API
   * @param {Object} params - Processing parameters
   * @returns {Promise<Object>} - Processing result
   */
  async processWithClaude({ prompt, skipThinking = false, saveDir }) {
    // Count tokens in the prompt
    this.emitOutput(`Counting tokens in prompt...\n`);
    const promptTokens = await this.claudeService.countTokens(prompt);
    
    // Calculate token budget
    const tokenBudgets = this.claudeService.calculateTokenBudgets(promptTokens);
    this.logTokenStats(tokenBudgets);
    
    // Check if prompt is too large
    if (tokenBudgets.isPromptTooLarge) {
      this.emitOutput(`Error: prompt is too large to have a ${tokenBudgets.configuredThinkingBudget} thinking budget!\n`);
      this.emitOutput(`Run aborted!\n`);
      throw new Error(`Prompt is too large for ${tokenBudgets.configuredThinkingBudget} thinking budget - run aborted`);
    }
    
    // Call Claude API with streaming
    this.emitOutput(`Sending request to Claude API (streaming)...\n`);
    this.displayWaitingMessage();
    
    const startTime = Date.now();
    let fullResponse = "";
    let thinkingContent = "";
    
    // Create system prompt to avoid markdown
    const systemPrompt = "CRITICAL INSTRUCTION: NO Markdown formatting of ANY kind. Never use headers, bullets, or any formatting symbols. Plain text only with standard punctuation.";
    
    try {
      await this.claudeService.streamWithThinking(
        prompt,
        {
          system: systemPrompt,
          max_tokens: tokenBudgets.maxTokens,
          thinking: {
            type: "enabled",
            budget_tokens: tokenBudgets.thinkingBudget
          }
        },
        // Callback for thinking content
        (thinkingDelta) => {
          thinkingContent += thinkingDelta;
        },
        // Callback for response text
        (textDelta) => {
          fullResponse += textDelta;
        }
      );
    } catch (error) {
      this.emitOutput(`\nAPI Error: ${error.message}\n`);
      throw error;
    }
    
    // Calculate elapsed time
    const elapsed = (Date.now() - startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    this.emitOutput(`\nCompleted in ${minutes}m ${seconds.toFixed(2)}s.\n`);
    
    // Count words in response
    const wordCount = this.countWords(fullResponse);
    this.emitOutput(`Response has approximately ${wordCount} words.\n`);
    
    // Count tokens in response
    const responseTokens = await this.claudeService.countTokens(fullResponse);
    this.emitOutput(`Response token count: ${responseTokens}\n`);
    
    // Remove any markdown formatting
    fullResponse = this.removeMarkdown(fullResponse);
    
    return {
      content: fullResponse,
      thinking: thinkingContent,
      stats: {
        promptTokens,
        responseTokens,
        wordCount,
        elapsedTime: elapsed,
        minutes,
        seconds
      }
    };
  }
  
  /**
   * Log token statistics
   * @param {Object} tokenBudgets - Token budget information
   */
  logTokenStats(tokenBudgets) {
    this.emitOutput(`\nToken stats:\n`);
    this.emitOutput(`Max AI model context window: [${tokenBudgets.contextWindow}] tokens\n`);
    this.emitOutput(`Input prompt tokens: [${tokenBudgets.promptTokens}] tokens\n`);
    this.emitOutput(`Available tokens: [${tokenBudgets.availableTokens}] tokens\n`);
    this.emitOutput(`Desired output tokens: [${tokenBudgets.desiredOutputTokens}] tokens\n`);
    this.emitOutput(`AI model thinking budget: [${tokenBudgets.thinkingBudget}] tokens\n`);
    this.emitOutput(`Max output tokens: [${tokenBudgets.maxTokens}] tokens\n`);
    
    if (tokenBudgets.capThinkingBudget) {
      this.emitOutput(`Warning: thinking budget is larger than 32K, set to 32K.\n`);
    }
  }
  
  /**
   * Display waiting message during API call
   */
  displayWaitingMessage() {
    this.emitOutput(`****************************************************************************\n`);
    this.emitOutput(`*  Processing with Claude API...                                           \n`);
    this.emitOutput(`*  This process typically takes several minutes.                           \n`);
    this.emitOutput(`*                                                                          \n`);
    this.emitOutput(`*  It's recommended to keep this window the sole 'focus'                   \n`);
    this.emitOutput(`*  and to avoid browsing online or running other apps, as these API        \n`);
    this.emitOutput(`*  network connections are often flakey, like delicate echoes of whispers. \n`);
    this.emitOutput(`*                                                                          \n`);
    this.emitOutput(`*  So breathe, remove eye glasses, stretch, relax, and be like water 🥋 🧘🏽‍♀️\n`);
    this.emitOutput(`****************************************************************************\n\n`);
  }
  
  /**
   * Save results to files
   * @param {Object} params - Save parameters
   * @returns {Promise<string[]>} - Array of saved file paths
   */
  async saveResults({
    content,
    thinking,
    stats,
    promptType,
    analysisLevel,
    saveDir,
    skipThinking = false,
    description = ''
  }) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const dateTimeStr = formatter.format(new Date());
      
      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      
      // Create descriptive filename
      const desc = description ? `_${description}` : '';
      const level = analysisLevel !== 'standard' ? `_${analysisLevel}` : '';
      const type = promptType !== 'main' ? `_${promptType}` : '';
      const baseFilename = `${this.name}${type}${level}${desc}_${timestamp}`;
      
      // Array to collect all saved file paths
      const savedFilePaths = [];
      
      // Create stats for thinking file
      const statsBlock = `
Details:  ${dateTimeStr}
Tool: ${this.name}
Prompt type: ${promptType}
Analysis level: ${analysisLevel}
${this.toolSettings.customOption1 ? `Custom option: ${this.toolSettings.customOption1}\n` : ''}
Max request timeout: ${this.config.request_timeout || 300} seconds
Max AI model context window: ${this.config.context_window || 200000} tokens
AI model thinking budget: ${this.config.thinking_budget_tokens || 32000} tokens
Desired output tokens: ${this.config.desired_output_tokens || 12000} tokens

Input tokens: ${stats.promptTokens}
Output tokens: ${stats.responseTokens}
`;
      
      // Save full response
      const reportFilename = `${baseFilename}.txt`;
      const reportPath = path.join(saveDir, reportFilename);
      await this.writeOutputFile(content, saveDir, reportFilename);
      savedFilePaths.push(reportPath);
      
      // Save thinking content if available and not skipped
      if (thinking && !skipThinking) {
        const thinkingFilename = `${baseFilename}_thinking.txt`;
        const thinkingPath = path.join(saveDir, thinkingFilename);
        const thinkingContent = `=== ${this.name.toUpperCase()} ANALYSIS ===

=== AI'S THINKING PROCESS ===

${thinking}

=== END AI'S THINKING PROCESS ===
${statsBlock}`;
        
        await this.writeOutputFile(thinkingContent, saveDir, thinkingFilename);
        this.emitOutput(`AI thinking saved to: ${thinkingPath}\n`);
        savedFilePaths.push(thinkingPath);
      }
      
      this.emitOutput(`Report saved to: ${reportPath}\n`);
      return savedFilePaths;
    } catch (error) {
      console.error(`Error saving report:`, error);
      this.emitOutput(`Error saving report: ${error.message}\n`);
      throw error;
    }
  }
}

module.exports = TemplateTool;