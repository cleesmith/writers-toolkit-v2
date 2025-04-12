/**
 * create-new-db.js
 * 
 * This script creates a new writers-toolkit-db.json file with a clean structure
 * optimized for our module-based architecture, while referencing data from
 * the old_writers-toolkit-db.json file.
 * 
 * Usage: node create-new-db.js
 */

const fs = require('fs');
const path = require('path');

// Path to the old JSON file
const OLD_FILE = path.join(__dirname, 'old_writers-toolkit-db.json');
// Path for the new JSON file
const NEW_FILE = path.join(__dirname, 'writers-toolkit-db.json');

// Read the old database
console.log(`Reading old database from ${OLD_FILE}...`);
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

// Extract tools from the old database
console.log('Converting tools...');
Object.entries(oldDb.tools).forEach(([id, tool]) => {
  // Extract the base name without extension
  let toolName = tool.name;
  
  // Convert .py extension to .js
  if (toolName.endsWith('.py')) {
    toolName = toolName.replace(/\.py$/, '.js');
  }
  
  // Use the name without extension as the key
  const baseName = toolName.replace(/\.(js|py)$/, '');
  
  // Convert the tool
  newDb.tools[baseName] = {
    id: baseName,
    name: toolName,
    title: tool.title || baseName,
    description: tool.description || '',
    help_text: tool.help_text || '',
    category: getToolCategory(tool),
    options: tool.options || []
  };
});

// Extract settings from the old database
console.log('Converting settings...');
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
console.log(`Writing new database to ${NEW_FILE}...`);
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
