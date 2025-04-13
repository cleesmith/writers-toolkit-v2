// src/tools/consistency-checker.js
const BaseTool = require('./base-tool');
const path = require('path');
const fs = require('fs/promises');
const util = require('util');

/**
 * Consistency Checker Tool
 * Checks a manuscript for consistency against a world document and optionally an outline
 * Supports different types of consistency checks: world, internal, development, unresolved
 */
class ConsistencyChecker extends BaseTool {
  /**
   * Constructor
   * @param {Object} claudeService - Claude API service
   * @param {Object} config - Tool configuration
   */
  constructor(claudeService, config = {}) {
    super('consistency_checker', config);
    this.claudeService = claudeService;
    console.log('ConsistencyChecker initialized with config:', 
      util.inspect(config, { depth: 1, colors: true }));
  }
  
  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    console.log('Executing ConsistencyChecker with options:', options);
    
    // Extract options
    const manuscriptFile = options.manuscript_file;
    const worldFile = options.world_file;
    const outlineFile = options.outline_file;
    const checkType = options.check_type || 'world';
    const skipThinking = options.skip_thinking || false;
    const checkDescription = options.check_description || '';
    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }

    const outputFiles = [];
    
    try {
      // Read the input files
      this.emitOutput(`Reading files...\n`);
      
      // Read the world file
      this.emitOutput(`Reading world file: ${worldFile}\n`);
      const worldContent = await this.readInputFile(worldFile);
      
      // Read the manuscript file
      this.emitOutput(`Reading manuscript file: ${manuscriptFile}\n`);
      const manuscriptContent = await this.readInputFile(manuscriptFile);
      
      // Read the outline file if provided
      let outlineContent = '';
      if (outlineFile) {
        this.emitOutput(`Reading outline file: ${outlineFile}\n`);
        outlineContent = await this.readInputFile(outlineFile);
      }
      
      // Prepare check types to run
      const checkTypes = checkType === 'all' 
        ? ['world', 'internal', 'development', 'unresolved']
        : [checkType];
      
      // Run each check type
      for (const type of checkTypes) {
        this.emitOutput(`\nRunning ${type.toUpperCase()} consistency check...\n`);
        
        // Create the prompt for this check type
        const prompt = this.createPrompt(type, outlineContent, worldContent, manuscriptContent);
        
        // Count tokens in the prompt
        this.emitOutput(`Counting tokens in prompt...\n`);
        const promptTokens = await this.claudeService.countTokens(prompt);
        
        // Calculate available tokens for response
        const contextWindow = this.config.context_window || 200000;
        const thinkingBudget = this.config.thinking_budget_tokens || 32000;
        const desiredOutputTokens = this.config.desired_output_tokens || 12000;
        
        const availableTokens = contextWindow - promptTokens;
        const maxOutputTokens = Math.min(availableTokens, 128000); // Limited by beta feature
        
        this.emitOutput(`\nToken stats:\n`);
        this.emitOutput(`Max AI model context window: [${contextWindow}] tokens\n`);
        this.emitOutput(`Input prompt tokens: [${promptTokens}] ...\n`);
        this.emitOutput(`                     = outline.txt + world.txt + manuscript.txt\n`);
        this.emitOutput(`                       + prompt instructions\n`);
        this.emitOutput(`Available tokens: [${availableTokens}]  = ${contextWindow} - ${promptTokens} = context_window - prompt\n`);
        this.emitOutput(`Desired output tokens: [${desiredOutputTokens}]\n`);
        this.emitOutput(`AI model thinking budget: [${thinkingBudget}] tokens\n`);
        this.emitOutput(`Max output tokens: [${maxOutputTokens}] tokens\n`);
        
        // Ensure thinking budget is less than max_tokens and leaves room for visible output
        const effectiveThinkingBudget = Math.min(thinkingBudget, maxOutputTokens - desiredOutputTokens);
        
        if (effectiveThinkingBudget < 1000) {
          this.emitOutput(`Error: prompt is too large to have sufficient thinking budget!\n`);
          throw new Error(`Prompt is too large for thinking budget`);
        }
        
        // Call Claude API with streaming
        this.emitOutput(`Sending request to Claude API (streaming)...\n`);
        
        const startTime = Date.now();
        let fullResponse = "";
        let thinkingContent = "";
        
        // Create system prompt to avoid markdown
        const systemPrompt = "NO Markdown! Never respond with Markdown formatting, plain text only.";
        
        try {
          // Use streaming API call
          await this.claudeService.streamWithThinking(
            prompt,
            {
              model: "claude-3-7-sonnet-20250219",
              system: systemPrompt,
              max_tokens: maxOutputTokens,
              thinking: {
                type: "enabled",
                budget_tokens: effectiveThinkingBudget
              },
              betas: ["output-128k-2025-02-19"]
            },
            // Callback for thinking content
            (thinkingDelta) => {
              thinkingContent += thinkingDelta;
            },
            // Callback for response text
            (textDelta) => {
              fullResponse += textDelta;
              // Print progress indicator
              if (fullResponse.length % 1000 === 0) {
                this.emitOutput(`.`);
              }
            }
          );
        } catch (error) {
          this.emitOutput(`\nAPI Error: ${error.message}\n`);
          throw error;
        }
        
        const elapsed = (Date.now() - startTime) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        this.emitOutput(`\nCompleted in ${minutes}m ${seconds.toFixed(2)}s.\n`);
        
        // Count words in response
        const wordCount = this.countWords(fullResponse);
        this.emitOutput(`Report has approximately ${wordCount} words.\n`);
        
        // Count tokens in response
        const responseTokens = await this.claudeService.countTokens(fullResponse);
        this.emitOutput(`Response token count: ${responseTokens}\n`);
        
        // Save the report
        const outputFile = await this.saveReport(
          type,
          fullResponse,
          thinkingContent,
          promptTokens,
          responseTokens,
          saveDir,
          skipThinking,
          checkDescription
        );
        
        outputFiles.push(outputFile);
      }
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          checkTypes: checkTypes
        }
      };
    } catch (error) {
      console.error('Error in ConsistencyChecker:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
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
   * Create prompt based on check type
   * @param {string} checkType - Type of consistency check
   * @param {string} outlineContent - Outline content
   * @param {string} worldContent - World content
   * @param {string} manuscriptContent - Manuscript content
   * @returns {string} - Prompt for Claude API
   */
  createPrompt(checkType, outlineContent, worldContent, manuscriptContent) {
    const noMarkdown = "IMPORTANT: - NO Markdown formatting";
    
    const prompts = {
      "world": `=== OUTLINE ===
${outlineContent}
=== END OUTLINE ===

=== WORLD ===
${worldContent}
=== END WORLD ===

=== MANUSCRIPT ===
${manuscriptContent}
=== END MANUSCRIPT ===

${noMarkdown}

You are an expert fiction editor with exceptional attention to detail.
Using the WORLD document as the established source of truth, analyze
the MANUSCRIPT for any inconsistencies or contradictions with the
established facts. Focus on:

1. CHARACTER CONSISTENCY:
   - Are characters acting in ways that match their established
     personality traits?
   - Does dialogue reflect their documented speech patterns and
     knowledge level?
   - Are relationships developing consistently with established
     dynamics?
   - Are physical descriptions matching those in the WORLD document?

2. SETTING & WORLD CONSISTENCY:
   - Are locations described consistently with their established
     features?
   - Does the manuscript respect the established rules of the world?

3. TIMELINE COHERENCE:
   - Does the manuscript respect the established historical events and
     their sequence?
   - Are there any temporal contradictions with established dates?
   - Is character knowledge appropriate for their place in the
     timeline?
   - Are seasonal elements consistent with the story's temporal
     placement?

4. THEMATIC INTEGRITY:
   - Are the established themes being consistently developed?
   - Are symbolic elements used consistently with their established meanings?

For each inconsistency, provide:
- The specific element in the manuscript that contradicts the WORLD
- The established fact in the WORLD it contradicts
- The location in the manuscript where this occurs using verbatim text
- A suggested correction that would maintain narrative integrity

Use the extensive thinking space to thoroughly cross-reference the
manuscript against the story's world before identifying issues.
`,

      "internal": `=== MANUSCRIPT ===
${manuscriptContent}
=== END MANUSCRIPT ===

${noMarkdown}

You are an expert fiction editor focusing on internal narrative
consistency. Analyze the MANUSCRIPT to identify elements that are
internally inconsistent or contradictory, regardless of the
established story world. Focus on:

1. NARRATIVE CONTINUITY:
   - Events that contradict earlier established facts within the
     manuscript itself
   - Description inconsistencies (characters, objects, settings
     changing without explanation)
   - Dialogue that contradicts earlier statements by the same
     character
   - Emotional arcs that show sudden shifts without sufficient
     development

2. SCENE-TO-SCENE COHERENCE:
   - Physical positioning and transitions between locations
   - Time of day and lighting inconsistencies
   - Character presence/absence in scenes without explanation
   - Weather or environmental conditions that change illogically

3. PLOT LOGIC:
   - Character motivations that seem inconsistent with their actions
   - Convenient coincidences that strain credibility
   - Information that characters possess without logical means of
     acquisition
   - Plot developments that contradict earlier established rules or
     limitations

4. POV CONSISTENCY:
   - Shifts in viewpoint that break established narrative patterns
   - Knowledge revealed that the POV character couldn't logically
     possess
   - Tone or voice inconsistencies within the same POV sections

For each issue found, provide:
- The specific inconsistency with exact manuscript locations
- Why it creates a continuity problem
- A suggested revision approach
`,

      "development": `=== OUTLINE ===
${outlineContent}
=== END OUTLINE ===

=== WORLD ===
${worldContent}
=== END WORLD ===

=== MANUSCRIPT ===
${manuscriptContent}
=== END MANUSCRIPT ===

${noMarkdown}

You are an expert fiction editor analyzing character and plot
development. Track how key elements evolve throughout the manuscript
and identify any development issues:

1. CHARACTER ARC TRACKING:
   - For each major character, trace their development through the manuscript
   - Identify key transformation moments and their emotional progression
   - Highlight any character development that feels rushed, stalled,
     or inconsistent
   - Note if their arc is following the trajectory established in the
     WORLD document

2. MYSTERY DEVELOPMENT:
   - Track the progression of the central mystery
   - Ensure clues are being revealed at an appropriate pace
   - Identify any critical information that's missing or presented out
     of logical sequence
   - Check if red herrings and misdirections are properly balanced
     with genuine progress

3. RELATIONSHIP EVOLUTION:
   - Track how key relationships develop
   - Ensure relationship changes are properly motivated and paced
   - Identify any significant jumps in relationship dynamics that need
     development

4. THEME DEVELOPMENT:
   - Track how the core themes from the WORLD document are being
     developed
   - Identify opportunities to strengthen thematic elements
   - Note if any established themes are being neglected

Provide a structured analysis showing the progression points for each
tracked element, identifying any gaps, pacing issues, or development
opportunities.
`,

      "unresolved": `=== MANUSCRIPT ===
${manuscriptContent}
=== END MANUSCRIPT ===

${noMarkdown}

You are an expert fiction editor specializing in narrative
completeness. Analyze the MANUSCRIPT to identify elements that have
been set up but not resolved:

1. UNRESOLVED PLOT ELEMENTS:
   - Mysteries or questions raised but not answered
   - Conflicts introduced but not addressed
   - Promises made to the reader (through foreshadowing or explicit
     setup) without payoff
   - Character goals established but not pursued

2. CHEKHOV'S GUNS:
   - Significant objects introduced but not used
   - Skills or abilities established but never employed
   - Locations described in detail but not utilized in the plot
   - Information revealed but not made relevant

3. CHARACTER THREADS:
   - Side character arcs that begin but don't complete
   - Character-specific conflicts that don't reach resolution
   - Backstory elements introduced but not integrated into the main
     narrative
   - Relationship dynamics that are established but not developed

For each unresolved element, provide:
- What was introduced and where in the manuscript
- Why it creates an expectation of resolution
- Suggested approaches for resolution or intentional non-resolution
`
    };
    
    return prompts[checkType] || "";
  }
  
  /**
   * Save report and thinking content to files
   * @param {string} checkType - Type of consistency check
   * @param {string} content - Response content
   * @param {string} thinking - Thinking content
   * @param {number} promptTokens - Prompt token count
   * @param {number} responseTokens - Response token count
   * @param {string} saveDir - Directory to save to
   * @param {boolean} skipThinking - Whether to skip saving thinking
   * @param {string} description - Optional description
   * @returns {Promise<string>} - Path to saved report
   */
  async saveReport(checkType, content, thinking, promptTokens, responseTokens, saveDir, skipThinking, description) {
    try {
      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      
      // Create descriptive filename
      const desc = description ? `_${description}` : '';
      const baseFilename = `consistency_${checkType}${desc}_${timestamp}`;
      
      // Create stats for thinking file
      const stats = `
Details:
Check type: ${checkType} consistency check
Max request timeout: ${this.config.request_timeout || 300} seconds
Max AI model context window: ${this.config.context_window || 200000} tokens
AI model thinking budget: ${this.config.thinking_budget_tokens || 32000} tokens
Desired output tokens: ${this.config.desired_output_tokens || 12000} tokens

Input tokens: ${promptTokens}
Output tokens: ${responseTokens}
`;
      
      // Save full response
      const reportFilename = `${baseFilename}.txt`;
      const reportPath = path.join(saveDir, reportFilename);
      await this.writeOutputFile(content, saveDir, reportFilename);
      
      // Save thinking content if available and not skipped
      if (thinking && !skipThinking) {
        const thinkingFilename = `${baseFilename}_thinking.txt`;
        const thinkingContent = `=== CONSISTENCY CHECK TYPE ===
${checkType}

=== AI'S THINKING PROCESS ===

${thinking}

=== END AI'S THINKING PROCESS ===
${stats}`;
        
        await this.writeOutputFile(thinkingContent, saveDir, thinkingFilename);
        this.emitOutput(`AI thinking saved to: ${path.join(saveDir, thinkingFilename)}\n`);
      }
      
      this.emitOutput(`Report saved to: ${reportPath}\n`);
      return reportPath;
    } catch (error) {
      console.error(`Error saving report:`, error);
      this.emitOutput(`Error saving report: ${error.message}\n`);
      throw error;
    }
  }
}

module.exports = ConsistencyChecker;
