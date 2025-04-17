/**
 * improved-convert-db.js
 * 
 * This script creates a new writers-toolkit-db.json file with a clean structure
 * optimized for our module-based architecture, while properly standardizing
 * all tool options formats.
 * 
 * Usage: node improved-convert-db.js
 */

const fs = require('fs');
const path = require('path');

// Path to the old JSON file
const OLD_FILE = path.join(__dirname, 'old_writers-toolkit-db.json');
// Path for the new JSON file
const NEW_FILE = path.join(__dirname, 'writers-toolkit-db.json');

// Read the old database
const jsonData = fs.readFileSync(OLD_FILE, 'utf8');
const oldDb = JSON.parse(jsonData);

// Create the new database structure
const newDb = {
  tools: {},
  settings: {
    claude_api: {},
    projects: {
      current: null,
      paths: {}
    },
    default_save_dir: null
  }
};

// Process option objects to standardize format
function processOption(option) {
  // Create a new standardized option object
  const newOption = {
    name: option.name,
    label: option.label || option.arg_name || option.name,
    type: getOptionType(option),
    description: option.description || '',
    required: option.required === true,
    default: option.default
  };

  // Remove -- prefix from name if present
  if (newOption.name && newOption.name.startsWith('--')) {
    newOption.name = newOption.name.substring(2);
  }

  // Convert arg_name to label if no label is provided
  if (option.arg_name && !option.label) {
    newOption.label = option.arg_name;
  }

  // Add min, max, step for number types
  if (newOption.type === 'number') {
    if (option.min !== undefined) newOption.min = option.min;
    if (option.max !== undefined) newOption.max = option.max;
    if (option.step !== undefined) newOption.step = option.step;
  }

  // Add choices for select types
  if (option.choices) {
    newOption.choices = option.choices;
  }

  // Add filters for file types
  if (option.filters) {
    newOption.filters = option.filters;
  }

  // Set group if provided
  if (option.group) {
    newOption.group = option.group;
  }

  return newOption;
}

// Determine the option type from the old format
function getOptionType(option) {
  // If type is explicitly provided and valid, use it
  if (option.type) {
    const type = option.type.toLowerCase();
    
    // Map old types to new standardized types
    switch (type) {
      case 'str':
        return 'text';
      case 'int':
      case 'float':
        return 'number';
      case 'bool':
        return 'boolean';
      case 'file':
      case 'directory':
      case 'select':
      case 'textarea':
        return type;
      default:
        return 'text'; // Default to text for unknown types
    }
  }
  
  // Otherwise try to infer type from other attributes
  if (option.choices) {
    return 'select';
  }
  
  if (option.default === true || option.default === false) {
    return 'boolean';
  }
  
  if (typeof option.default === 'number' || option.min !== undefined || option.max !== undefined) {
    return 'number';
  }
  
  // Default to text type
  return 'text';
}

// Extract tools from the old database
Object.entries(oldDb.tools).forEach(([id, tool]) => {
  // Extract the base name without extension
  let toolName = tool.name;
  
  // Convert .py extension to .js
  if (toolName.endsWith('.py')) {
    toolName = toolName.replace(/\.py$/, '.js');
  }
  
  // Use the name without extension as the key
  const baseName = toolName.replace(/\.(js|py)$/, '');
  
  // Process all options to standardize format
  const processedOptions = Array.isArray(tool.options) 
    ? tool.options.map(processOption) 
    : [];
  
  // Convert the tool
  newDb.tools[baseName] = {
    id: baseName,
    name: toolName,
    title: tool.title || baseName,
    description: tool.description || '',
    help_text: tool.help_text || '',
    category: getToolCategory(tool),
    options: processedOptions
  };
});

// Extract settings from the old database
if (oldDb.settings && oldDb.settings["1"]) {
  const oldSettings = oldDb.settings["1"];
  
  // Claude API configuration
  if (oldSettings.claude_api_configuration) {
    newDb.settings.claude_api = oldSettings.claude_api_configuration;
  }
  
  // Projects
  if (oldSettings.current_project) {
    newDb.settings.projects.current = oldSettings.current_project;
    
    if (oldSettings.current_project_path) {
      newDb.settings.projects.paths[oldSettings.current_project] = oldSettings.current_project_path;
    }
  }
  
  // Default save directory
  if (oldSettings.default_save_dir) {
    newDb.settings.default_save_dir = oldSettings.default_save_dir;
  }
}

// Helper function to categorize tools
function getToolCategory(tool) {
  const name = (tool.name || '').toLowerCase();
  
  if (name.includes('brainstorm') || name.includes('outline') || 
      name.includes('world') || name.includes('chapter')) {
    return 'creation';
  }
  
  if (name.includes('counter') || name.includes('analyzer') || 
      name.includes('checker') || name.includes('tracker')) {
    return 'analysis';
  }
  
  if (name.includes('consistency') || name.includes('optimizer') || 
      name.includes('auditor') || name.includes('evaluator')) {
    return 'editing';
  }
  
  return 'other';
}

// Write the new JSON file
fs.writeFileSync(
  NEW_FILE, 
  JSON.stringify(newDb, null, 2),
  'utf8'
);

console.log('Database creation completed!');
console.log(`Total tools converted: ${Object.keys(newDb.tools).length}`);
console.log('\nNext steps:');
console.log('1. Update database.js to work with the new structure');
console.log('2. Implement the module-based architecture');
