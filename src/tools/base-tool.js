// src/tools/base-tool.js
const fs = require('fs/promises');
const path = require('path');

/**
 * Base class for all tools
 */
class BaseTool {
  /**
   * Constructor
   * @param {string} name - Tool name
   * @param {object} config - Tool configuration
   */
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    console.log(`BaseTool initialized: ${name}`);
  }
  
  /**
   * Execute the tool - must be implemented by subclasses
   * @param {object} options - Tool options
   * @returns {Promise<object>} - Tool execution result
   */
  async execute(options) {
    throw new Error(`Tool ${this.name} must implement execute method`);
  }
  
  /**
   * Read a file
   * @param {string} filePath - Path to file
   * @param {string} encoding - File encoding
   * @returns {Promise<string>} - File content
   */
  async readInputFile(filePath, encoding = 'utf-8') {
    try {
      const content = await fs.readFile(filePath, encoding);
      if (!content.trim()) {
        throw new Error(`File is empty: ${filePath}`);
      }
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }
  
  /**
   * Write content to a file
   * @param {string} content - Content to write
   * @param {string} saveDir - Directory to save to
   * @param {string} fileName - File name
   * @returns {Promise<string>} - Path to the saved file
   */
  async writeOutputFile(content, saveDir, fileName) {
    try {
      // Ensure the directory exists
      await fs.mkdir(saveDir, { recursive: true });
      
      // Path to the output file
      const outputPath = path.join(saveDir, fileName);
      
      // Write the file
      await fs.writeFile(outputPath, content, 'utf-8');
      
      // Return the absolute path to the file
      return path.resolve(outputPath);
    } catch (error) {
      console.error(`Error writing file ${fileName}:`, error);
      throw error;
    }
  }
  
  /**
   * Emit output to be displayed in the UI
   * This will be overridden by the tool runner
   * @param {string} text - Text to emit
   */
  emitOutput(text) {
    console.log(text);
  }
}

module.exports = BaseTool;
