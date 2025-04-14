// src/tool-system.js
const path = require('path');
const ClaudeAPIService = require('./claude-api/client');
const toolRegistry = require('./tools/registry');
const TokensWordsCounter = require('./tools/tokens-words-counter');
const ConsistencyChecker = require('./tools/consistency-checker');
const BrainstormTool = require('./tools/brainstorm');

/**
 * Initialize the tool system
 * @param {Object} settings - Claude API settings
 * @param {Object} database - Database instance
 */
async function initializeToolSystem(settings, database) {
  console.log('Initializing tool system...');
  
  // Make sure the database is initialized
  if (!database.isInitialized) {
    console.log('Initializing database...');
    await database.init();
  }
  
  // Create Claude API service
  console.log('Creating Claude API service...');
  const claudeService = new ClaudeAPIService(settings);
  
  // Get tools from database
  const dbTools = database.getTools();
  console.log(`Found ${dbTools.length} tools in database`);
  
  // Register available tool implementations
  dbTools.forEach(toolInfo => {
    console.log(`Checking tool: ${toolInfo.name}`);
    
    // For tokens_words_counter.js
    if (toolInfo.name === 'tokens_words_counter') {
      const toolConfig = database.getToolByName(toolInfo.name);
      console.log('Tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name, // Use ID as the registry key
          new TokensWordsCounter(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'brainstorm') {
      const toolConfig = database.getToolByName(toolInfo.name);
      console.log('Brainstorm tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new BrainstormTool(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    // For consistency_checker.js
    else if (toolInfo.name === 'consistency_checker') {
      const toolConfig = database.getToolByName(toolInfo.name);
      console.log('Consistency Checker tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new ConsistencyChecker(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
  });
  
  return {
    claudeService,
    toolRegistry
  };
}

/**
 * Execute a tool by ID
 * @param {string} toolId - Tool ID
 * @param {Object} options - Tool options
 * @returns {Promise<Object>} - Tool execution result
 */
async function executeToolById(toolId, options) {
  console.log(`Executing tool: ${toolId} with options:`, options);
  
  // Get the tool implementation
  const tool = toolRegistry.getTool(toolId);
  
  if (!tool) {
    console.error(`Tool not found: ${toolId}`);
    throw new Error(`Tool not found: ${toolId}`);
  }
  
  try {
    // Execute the tool
    console.log(`Starting execution of tool: ${toolId}`);
    const result = await tool.execute(options);
    console.log(`Tool execution complete: ${toolId}`);
    return result;
  } catch (error) {
    console.error(`Error executing tool ${toolId}:`, error);
    throw error;
  }
}

module.exports = {
  initializeToolSystem,
  executeToolById,
  toolRegistry
};