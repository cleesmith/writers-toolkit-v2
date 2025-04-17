// src/tool-system.js
const path = require('path');
const ClaudeAPIService = require('./claude-api/client');

const toolRegistry = require('./tools/registry');

const TokensWordsCounter = require('./tools/tokens-words-counter');
const NarrativeIntegrity = require('./tools/narrative-integrity');
const BrainstormTool = require('./tools/brainstorm');
const OutlineWriter = require('./tools/outline-writer');
const WorldWriter = require('./tools/world-writer');
const ChapterWriter = require('./tools/chapter-writer');
const CharacterAnalyzer = require('./tools/character-analyzer');
const TenseConsistencyChecker = require('./tools/tense-consistency-checker');
const AdjectiveAdverbOptimizer = require('./tools/adjective-adverb-optimizer');
const DanglingModifierChecker = require('./tools/dangling-modifier-checker');
const RhythmAnalyzer = require('./tools/rhythm-analyzer');
const CrowdingLeapingEvaluator = require('./tools/crowding-leaping-evaluator');
const PunctuationAuditor = require('./tools/punctuation-auditor');
const ConflictAnalyzer = require('./tools/conflict-analyzer');
const ForeshadowingTracker = require('./tools/foreshadowing-tracker');
const PlotThreadTracker = require('./tools/plot-thread-tracker');

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
  
  // Register available tool implementations
  dbTools.forEach(toolInfo => {
    // console.log(`Checking tool: ${toolInfo.name}`);
    
    // For tokens_words_counter.js
    if (toolInfo.name === 'tokens_words_counter') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name, // Use ID as the registry key
          new TokensWordsCounter(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'narrative_integrity') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Narrative Integrity tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new NarrativeIntegrity(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'brainstorm') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Brainstorm tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new BrainstormTool(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'outline_writer') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Outline Writer tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new OutlineWriter(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'world_writer') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('World Writer tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new WorldWriter(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'chapter_writer') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Chapter Writer tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new ChapterWriter(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'character_analyzer') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Chapter Analyzer tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new CharacterAnalyzer(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'tense_consistency_checker') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Tense Consistency Checker tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new TenseConsistencyChecker(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'adjective_adverb_optimizer') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Adjective Adverb Optimizer tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new AdjectiveAdverbOptimizer(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'dangling_modifier_checker') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Dangling Modifier Checker tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new DanglingModifierChecker(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'rhythm_analyzer') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Rhythm Analyzer tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new RhythmAnalyzer(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'crowding_leaping_evaluator') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Crowding Leaping Evaluator tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new CrowdingLeapingEvaluator(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'punctuation_auditor') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Punctuation Auditor tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new PunctuationAuditor(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'conflict_analyzer') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Conflict Analyzer tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new ConflictAnalyzer(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'foreshadowing_tracker') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Foreshadowing Tracker tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new ForeshadowingTracker(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }
    else if (toolInfo.name === 'plot_thread_tracker') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Plot Thread Tracker tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new PlotThreadTracker(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`Successfully registered tool: ${toolInfo.name}`);
      }
    }

  });
  console.log(`Found ${dbTools.length} tools in database`);
  
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

/**
 * Reinitialize the Claude API service with updated settings
 * @param {Object} settings - Claude API settings
 * @returns {Object} - New Claude API service instance
 */
function reinitializeClaudeService(settings) {
  // Create a new Claude service with the updated settings
  const claudeService = new ClaudeAPIService(settings);
  
  // Update the service in all registered tools
  for (const toolId of toolRegistry.getAllToolIds()) {
    const tool = toolRegistry.getTool(toolId);
    tool.claudeService = claudeService;
  }
  
  return claudeService;
}

module.exports = {
  initializeToolSystem,
  executeToolById,
  reinitializeClaudeService, // Add the missing export here
  toolRegistry
};