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
    this.config = {
      max_retries: config.max_retries || 1,
      request_timeout: config.request_timeout || 300,
      context_window: config.context_window || 200000,
      thinking_budget_tokens: config.thinking_budget_tokens || 32000,
      betas_max_tokens: config.betas_max_tokens || 128000,
      desired_output_tokens: config.desired_output_tokens || 12000
    };
    
    // Create Claude API client
    this.client = new anthropic.Anthropic({
      timeout: this.config.request_timeout * 1000, // convert seconds to ms
      maxRetries: this.config.max_retries,
    });
    
    console.log('Claude API Service initialized');
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
}

module.exports = ClaudeAPIService;
