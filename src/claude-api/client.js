// src/claude-api/client.js
const anthropic = require('@anthropic-ai/sdk');

/**
 * Claude API Service
 * Handles interactions with the Claude AI API
 * Uses UI settings with no hardcoded values
 */
class ClaudeAPIService {
  /**
   * Constructor
   * @param {Object} config - API configuration from UI settings
   */
  constructor(config = {}) {
    // Validate required settings
    this.validateConfig(config);
    
    // Store all config values
    this.config = {
      max_retries: config.max_retries,
      request_timeout: config.request_timeout,
      context_window: config.context_window,
      thinking_budget_tokens: config.thinking_budget_tokens,
      betas_max_tokens: config.betas_max_tokens,
      desired_output_tokens: config.desired_output_tokens,
      model_name: config.model_name,
      betas: config.betas,
      max_thinking_budget: config.max_thinking_budget
    };
    
    // Create Claude API client
    this.client = new anthropic.Anthropic({
      timeout: this.config.request_timeout * 1000, // convert seconds to ms
      maxRetries: this.config.max_retries,
    });
    
    console.log('Claude API Service initialized with:');
    console.log('- Context window:', this.config.context_window);
    console.log('- Model name:', this.config.model_name);
    console.log('- Beta features:', this.config.betas);
    console.log('- Max thinking budget:', this.config.max_thinking_budget);
  }
  
  /**
   * Helper method to convert betas string to array for API calls
   * @returns {string[]} Array of beta features
   */
  _getBetasArray() {
    return this.config.betas.split(',')
      .map(beta => beta.trim())
      .filter(beta => beta.length > 0);
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
      'desired_output_tokens',
      'model_name',
      'betas',
      'max_thinking_budget'
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
        model: this.config.model_name,
        messages: [{ role: "user", content: text }],
        thinking: {
          type: "enabled",
          budget_tokens: this.config.thinking_budget_tokens
        },
        betas: this._getBetasArray()
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
   * @param {Object} options - API options (only system is allowed to be overridden)
   * @returns {Promise<Object>} - Response with content and thinking
   */
  async completeWithThinking(prompt, options = {}) {
    const modelOptions = {
      model: this.config.model_name,
      max_tokens: this.config.betas_max_tokens,
      messages: [{ role: "user", content: prompt }],
      thinking: {
        type: "enabled",
        budget_tokens: this.config.thinking_budget_tokens
      },
      betas: this._getBetasArray()
    };
    
    // Only allow system prompt to be overridden
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
   * @param {Object} options - API options (only system is allowed to be overridden)
   * @param {Function} onThinking - Callback for thinking content
   * @param {Function} onText - Callback for response text
   * @returns {Promise<void>}
   */
  async streamWithThinking(prompt, options = {}, onThinking, onText) {
    const modelOptions = {
      model: this.config.model_name,
      max_tokens: this.config.betas_max_tokens,
      messages: [{ role: "user", content: prompt }],
      thinking: {
        type: "enabled",
        budget_tokens: this.config.thinking_budget_tokens
      },
      betas: this._getBetasArray()
    };
    
    // Only allow system prompt to be overridden
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
   * @returns {Object} - Calculated token budgets and limits
   */
  calculateTokenBudgets(promptTokens) {
    // Use configuration settings directly
    const contextWindow = this.config.context_window;
    const desiredOutputTokens = this.config.desired_output_tokens;
    const configuredThinkingBudget = this.config.thinking_budget_tokens;
    const betasMaxTokens = this.config.betas_max_tokens;
    const maxThinkingBudget = this.config.max_thinking_budget;
    
    // Calculate available tokens after prompt
    const availableTokens = contextWindow - promptTokens;
    
    // For API call, max_tokens must respect the API limit
    const maxTokens = Math.min(availableTokens, betasMaxTokens);
    
    // Thinking budget must be LESS than max_tokens to leave room for visible output
    let thinkingBudget = maxTokens - desiredOutputTokens;
    
    // Cap thinking budget if it's too large - use configurable limit
    const capThinkingBudget = thinkingBudget > maxThinkingBudget;
    if (capThinkingBudget) {
      thinkingBudget = maxThinkingBudget;
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