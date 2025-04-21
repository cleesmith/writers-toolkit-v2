// src/tool-system.js
const path = require('path');
const { app } = require('electron');
const ClaudeAPIService = require('./claude-api/client');

const toolRegistry = require('./tools/registry');

function requireTool(toolName) {
  try {
    // Get all possible paths for this tool
    const possiblePaths = getAbsoluteToolPath(toolName);
    
    // Try each path until one works
    let loadError = null;
    
    for (const toolPath of possiblePaths) {
      try {
        console.log(`Attempting to require tool from: ${toolPath}`);
        const Tool = require(toolPath);
        console.log(`Successfully loaded tool from: ${toolPath}`);
        return Tool;
      } catch (error) {
        console.log(`Failed to load from ${toolPath}: ${error.message}`);
        loadError = error; // Save the last error
      }
    }
    
    // If we get here, none of the paths worked
    throw loadError || new Error(`Could not load tool ${toolName} from any path`);
  } catch (error) {
    console.error(`All attempts to load tool ${toolName} failed:`, error);
    throw error;
  }
}

// Dynamically load all tools
let TokensWordsCounter, ManuscriptToOutlineCharactersWorld, NarrativeIntegrity,
    BrainstormTool, OutlineWriter, WorldWriter, ChapterWriter, CharacterAnalyzer,
    TenseConsistencyChecker, AdjectiveAdverbOptimizer, DanglingModifierChecker,
    RhythmAnalyzer, CrowdingLeapingEvaluator, PunctuationAuditor,
    ConflictAnalyzer, ForeshadowingTracker, PlotThreadTracker, KDPPublishingPrep;

try {
  TokensWordsCounter = requireTool('tokens-words-counter');
  ManuscriptToOutlineCharactersWorld = requireTool('manuscript-to-outline-characters-world');
  NarrativeIntegrity = requireTool('narrative-integrity');
  BrainstormTool = requireTool('brainstorm');
  OutlineWriter = requireTool('outline-writer');
  WorldWriter = requireTool('world-writer');
  ChapterWriter = requireTool('chapter-writer');
  CharacterAnalyzer = requireTool('character-analyzer');
  TenseConsistencyChecker = requireTool('tense-consistency-checker');
  AdjectiveAdverbOptimizer = requireTool('adjective-adverb-optimizer');
  DanglingModifierChecker = requireTool('dangling-modifier-checker');
  RhythmAnalyzer = requireTool('rhythm-analyzer');
  CrowdingLeapingEvaluator = requireTool('crowding-leaping-evaluator');
  PunctuationAuditor = requireTool('punctuation-auditor');
  ConflictAnalyzer = requireTool('conflict-analyzer');
  ForeshadowingTracker = requireTool('foreshadowing-tracker');
  PlotThreadTracker = requireTool('plot-thread-tracker');
  KDPPublishingPrep = requireTool('kdp-publishing-prep');
} catch (error) {
  console.error('Error loading tools:', error);
}

// const TokensWordsCounter = require('./tools/tokens-words-counter');
// const ManuscriptToOutlineCharactersWorld = require('./tools/manuscript-to-outline-characters-world');
// const NarrativeIntegrity = require('./tools/narrative-integrity');
// const BrainstormTool = require('./tools/brainstorm');
// const OutlineWriter = require('./tools/outline-writer');
// const WorldWriter = require('./tools/world-writer');
// const ChapterWriter = require('./tools/chapter-writer');
// const CharacterAnalyzer = require('./tools/character-analyzer');
// const TenseConsistencyChecker = require('./tools/tense-consistency-checker');
// const AdjectiveAdverbOptimizer = require('./tools/adjective-adverb-optimizer');
// const DanglingModifierChecker = require('./tools/dangling-modifier-checker');
// const RhythmAnalyzer = require('./tools/rhythm-analyzer');
// const CrowdingLeapingEvaluator = require('./tools/crowding-leaping-evaluator');
// const PunctuationAuditor = require('./tools/punctuation-auditor');
// const ConflictAnalyzer = require('./tools/conflict-analyzer');
// const ForeshadowingTracker = require('./tools/foreshadowing-tracker');
// const PlotThreadTracker = require('./tools/plot-thread-tracker');
// const KDPPublishingPrep = require('./tools/kdp-publishing-prep');

function getAbsoluteToolPath(toolName) {
  const { app } = require('electron');
  const path = require('path');
  
  // Get app's base directory (always works regardless of launch method)
  const appDir = path.dirname(app.getAppPath());
  
  // Build possible paths
  const possiblePaths = [
    // First try the path inside app.asar
    path.join(app.getAppPath(), 'src', 'tools', `${toolName}.js`),
    // Then try the path inside app.asar.unpacked if it exists
    path.join(app.getAppPath().replace('.asar', '.asar.unpacked'), 'src', 'tools', `${toolName}.js`),
    // Try with hyphens instead of underscores
    path.join(app.getAppPath(), 'src', 'tools', `${toolName.replace(/_/g, '-')}.js`),
    path.join(app.getAppPath().replace('.asar', '.asar.unpacked'), 'src', 'tools', `${toolName.replace(/_/g, '-')}.js`)
  ];
  
  // Log paths for debugging
  console.log(`Possible paths for tool ${toolName}:`);
  possiblePaths.forEach(p => console.log(` - ${p}`));
  
  // Return all possible paths to try
  return possiblePaths;
}

function getToolPath(toolName) {
  try {
    // Get the app path
    const appPath = app.getAppPath();
    console.log(`App path: ${appPath}`);
    
    // Check if running from asar archive
    if (appPath.includes('.asar')) {
      // For unpacked files, we need to use .asar.unpacked path
      const unpackedPath = appPath.replace('.asar', '.asar.unpacked');
      const toolUnpackedPath = path.join(unpackedPath, 'src', 'tools', `${toolName}.js`);
      
      const fs = require('fs');
      if (fs.existsSync(toolUnpackedPath)) {
        console.log(`Found tool at: ${toolUnpackedPath}`);
        return toolUnpackedPath;
      }
      
      // Try with hyphens instead of underscores (tokens-words-counter vs tokens_words_counter)
      const hyphenatedName = toolName.replace(/_/g, '-');
      const hyphenatedPath = path.join(unpackedPath, 'src', 'tools', `${hyphenatedName}.js`);
      
      if (fs.existsSync(hyphenatedPath)) {
        console.log(`Found tool with hyphenated name at: ${hyphenatedPath}`);
        return hyphenatedPath;
      }
      
      console.warn(`Tool not found at unpacked path: ${toolUnpackedPath}`);
    }
    
    // Development fallback
    return `./tools/${toolName}`;
  } catch (error) {
    console.error(`Error resolving path for tool ${toolName}:`, error);
    return `./tools/${toolName}`;
  }
}

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
    else if (toolInfo.name === 'manuscript_to_outline_characters_world') {
      const toolConfig = database.getToolByName(toolInfo.name);
      // console.log('Manuscript To Outline Characters World tool config:', toolConfig);
      
      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new ManuscriptToOutlineCharactersWorld(claudeService, {
            ...toolConfig,
            ...settings
          })
        );
        // console.log(`>>> Successfully registered tool: ${toolInfo.name}`);
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
    else if (toolInfo.name === 'kdp_publishing_prep') {
      const toolConfig = database.getToolByName(toolInfo.name);

      if (toolConfig) {
        // Register the tool
        toolRegistry.registerTool(
          toolInfo.name,
          new KDPPublishingPrep(claudeService, {
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