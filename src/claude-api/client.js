// src/claude-api/client.js
const anthropic = require('@anthropic-ai/sdk');

/**
 * Claude API Service
 * Handles interactions with the Claude AI API
 */
class ClaudeAPIService {
  /**
   * Constructor
   * @param {Object} config - API configuration
   */

  constructor(config = {}) {
    // First, check if required settings are present
    this.validateConfig(config);
    
    this.config = {
      max_retries: config.max_retries,
      request_timeout: config.request_timeout,
      context_window: config.context_window,
      thinking_budget_tokens: config.thinking_budget_tokens,
      betas_max_tokens: config.betas_max_tokens,
      desired_output_tokens: config.desired_output_tokens
    };
    
    // Create Claude API client
    this.client = new anthropic.Anthropic({
      timeout: this.config.request_timeout * 1000, // convert seconds to ms
      maxRetries: this.config.max_retries,
    });
    
    console.log('Claude API Service initialized with context window:', this.config.context_window);
  }

  /**
   * Validates that all required configuration values are present
   * @param {Object} config - API configuration
   * @throws {Error} If any required settings are missing
   */
  validateConfig(config) {
    const requiredSettings = [
      'max_retries',
      'request_timeout',
      'context_window',
      'thinking_budget_tokens',
      'betas_max_tokens',
      'desired_output_tokens'
    ];
    
    const missingSettings = requiredSettings.filter(setting => config[setting] === undefined);
    
    if (missingSettings.length > 0) {
      throw new Error(`Missing required Claude API settings: ${missingSettings.join(', ')}. Check API Settings configuration.`);
    }
  }
  
  /**
   * Count tokens in a text string
   * @param {string} text - Text to count tokens in
   * @returns {Promise<number>} - Token count
   */
  async countTokens(text) {
    try {
      const response = await this.client.beta.messages.countTokens({
        model: "claude-3-7-sonnet-20250219",
        messages: [{ role: "user", content: text }],
        thinking: {
          type: "enabled",
          budget_tokens: this.config.thinking_budget_tokens
        },
        betas: ["output-128k-2025-02-19"]
      });
      
      return response.input_tokens;
    } catch (error) {
      console.error('Token counting error:', error);
      throw error;
    }
  }
  
  /**
   * Complete a prompt with thinking
   * @param {string} prompt - Prompt to complete
   * @param {Object} options - API options
   * @returns {Promise<Object>} - Response with content and thinking
   */
  async completeWithThinking(prompt, options = {}) {
    const modelOptions = {
      model: options.model || "claude-3-7-sonnet-20250219",
      max_tokens: options.max_tokens || this.config.betas_max_tokens,
      messages: [{ role: "user", content: prompt }],
      thinking: {
        type: "enabled",
        budget_tokens: options.thinking_budget || this.config.thinking_budget_tokens
      },
      betas: ["output-128k-2025-02-19"]
    };
    
    if (options.system) {
      modelOptions.system = options.system;
    }
    
    try {
      const response = await this.client.beta.messages.create(modelOptions);
      
      // Extract main content and thinking
      const content = response.content[0].text;
      const thinking = response.thinking || "";
      
      return { content, thinking };
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  }
  
  /**
   * Stream a response with thinking using callbacks
   * @param {string} prompt - Prompt to complete
   * @param {Object} options - API options
   * @param {Function} onThinking - Callback for thinking content
   * @param {Function} onText - Callback for response text
   * @returns {Promise<void>}
   */
  async streamWithThinking(prompt, options = {}, onThinking, onText) {
    const modelOptions = {
      model: options.model || "claude-3-7-sonnet-20250219",
      max_tokens: options.max_tokens || this.config.betas_max_tokens,
      messages: [{ role: "user", content: prompt }],
      thinking: {
        type: "enabled",
        budget_tokens: options.thinking?.budget_tokens || this.config.thinking_budget_tokens
      },
      betas: options.betas || ["output-128k-2025-02-19"]
    };
    
    if (options.system) {
      modelOptions.system = options.system;
    }
    
    try {
      const stream = await this.client.beta.messages.stream(modelOptions);
      
      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          if (event.delta.type === "thinking_delta") {
            // Call thinking callback with delta
            if (onThinking && typeof onThinking === 'function') {
              onThinking(event.delta.thinking);
            }
          } else if (event.delta.type === "text_delta") {
            // Call text callback with delta
            if (onText && typeof onText === 'function') {
              onText(event.delta.text);
            }
          }
        }
      }
    } catch (error) {
      console.error('API streaming error:', error);
      throw error;
    }
  }

  /**
   * Calculate token budgets and validate prompt size
   * @param {number} promptTokens - Number of tokens in the prompt
   * @param {Object} options - Optional override values for calculations
   * @returns {Object} - Calculated token budgets and limits
   * @throws {Error} - If prompt is too large for configured thinking budget
   */
  calculateTokenBudgets(promptTokens, options = {}) {
    // Use config directly, applying any overrides from options
    const contextWindow = options.context_window || this.config.context_window;
    const desiredOutputTokens = options.desired_output_tokens || this.config.desired_output_tokens;
    const configuredThinkingBudget = options.thinking_budget_tokens || this.config.thinking_budget_tokens;
    const betasMaxTokens = options.betas_max_tokens || this.config.betas_max_tokens;
    
    // Calculate available tokens after prompt
    const availableTokens = contextWindow - promptTokens;
    
    // For API call, max_tokens must respect the API limit
    const maxTokens = Math.min(availableTokens, betasMaxTokens);
    
    // Thinking budget must be LESS than max_tokens to leave room for visible output
    let thinkingBudget = maxTokens - desiredOutputTokens;
    
    // Cap thinking budget if it's too large
    const capThinkingBudget = thinkingBudget > 32000;
    if (capThinkingBudget) {
      thinkingBudget = 32000;
    }
    
    // Check if prompt is too large for the configured thinking budget
    const isPromptTooLarge = thinkingBudget < configuredThinkingBudget;
    
    // Return all calculated values for use in API calls and logging
    return {
      contextWindow,
      promptTokens,
      availableTokens,
      maxTokens,
      thinkingBudget,
      desiredOutputTokens,
      betasMaxTokens,
      configuredThinkingBudget,
      capThinkingBudget,
      isPromptTooLarge
    };
  }

}

module.exports = ClaudeAPIService;
