// src/database.js (Updated for new database structure)
const path = require('path');
const os = require('os');

let Store = null;

class Database {
  constructor() {
    this.store = null;
    this.isInitialized = false;
  }

  // Called once to initialize the store
  async init() {
    if (!this.isInitialized) {
      // If not already imported, do a dynamic import of electron-store.
      if (!Store) {
        // Dynamic import returns a module namespace, so we need to reference .default
        const storeModule = await import('electron-store');
        Store = storeModule.default;
      }

      this.store = new Store({
        name: 'writers-toolkit-db',
        cwd: path.join(__dirname, '..'),
        defaults: {
          tools: {},
          settings: {
            claude_api: {
              max_retries: 1,
              request_timeout: 300,
              context_window: 200000,
              thinking_budget_tokens: 32000,
              betas_max_tokens: 128000,
              desired_output_tokens: 12000
            },
            projects: {
              current: null,
              paths: {}
            },
            default_save_dir: path.join(os.homedir(), 'writing')
          }
        }
      });

      this.isInitialized = true;
      console.log(`Database location: ${this.store.path}`);
    }
  }

  // Retrieve all tools (excluding any name starting with underscore)
  getTools() {
    if (!this.isInitialized || !this.store) {
      throw new Error('Store not initialized. Call init() first.');
    }

    const tools = this.store.get('tools', {});
    const toolsList = [];

    // Convert from the object format to an array of tools
    Object.entries(tools).forEach(([id, tool]) => {
      if (tool.name && !tool.name.startsWith('_')) {
        toolsList.push({
          name: id, // Use the ID as the name
          title: tool.title || tool.name,
          description: tool.description || 'No description available'
        });
      }
    });

    return toolsList;
  }

  // Retrieve a specific tool by name
  getToolByName(toolName) {
    if (!this.isInitialized || !this.store) {
      throw new Error('Store not initialized. Call init() first.');
    }

    const tools = this.store.get('tools', {});

    // Direct lookup by ID
    if (tools[toolName]) {
      return tools[toolName];
    }

    // If not found by ID, search by name property
    for (const id in tools) {
      if (tools[id].name === toolName) {
        return tools[id];
      }
    }

    return null;
  }

  // Add or update a tool
  async addOrUpdateTool(tool) {
    if (!this.isInitialized || !this.store) {
      throw new Error('Store not initialized. Call init() first.');
    }

    const tools = this.store.get('tools', {});
    
    // Use tool.id as the key if available, otherwise use tool.name
    const toolId = tool.id || tool.name.replace(/\.(js|py)$/, '');
    
    // Update tools object
    tools[toolId] = tool;

    // Save back to store
    this.store.set('tools', tools);
    return true;
  }

  // Delete a tool
  async deleteTool(toolName) {
    if (!this.isInitialized || !this.store) {
      throw new Error('Store not initialized. Call init() first.');
    }

    const tools = this.store.get('tools', {});

    // Remove by ID
    if (tools[toolName]) {
      delete tools[toolName];
      this.store.set('tools', tools);
      return true;
    }

    // Find by name and remove
    for (const id in tools) {
      if (tools[id].name === toolName) {
        delete tools[id];
        this.store.set('tools', tools);
        return true;
      }
    }

    return false;
  }

  // Retrieve global settings
  getGlobalSettings() {
    if (!this.isInitialized || !this.store) {
      throw new Error('Store not initialized. Call init() first.');
    }
    
    // Get current project and path
    const currentProject = this.store.get('settings.projects.current', null);
    const projectPaths = this.store.get('settings.projects.paths', {});
    const currentProjectPath = currentProject ? (projectPaths[currentProject] || null) : null;
    
    return {
      claude_api_configuration: this.store.get('settings.claude_api', {}),
      current_project: currentProject,
      current_project_path: currentProjectPath,
      default_save_dir: this.store.get('settings.default_save_dir', path.join(os.homedir(), 'writing'))
    };
  }

  // Update global settings
  async updateGlobalSettings(settings) {
    if (!this.isInitialized || !this.store) {
      throw new Error('Store not initialized. Call init() first.');
    }

    // Update Claude API settings
    if (settings.claude_api_configuration) {
      this.store.set('settings.claude_api', settings.claude_api_configuration);
    }

    // Create a completely new projects object that contains only the current project
    if (settings.current_project) {
      // Set current project
      this.store.set('settings.projects.current', settings.current_project);
      
      // IMPORTANT CHANGE: Completely replace the paths object instead of merging
      // This ensures only the current project is stored
      if (settings.current_project_path) {
        const newPaths = {};
        newPaths[settings.current_project] = settings.current_project_path;
        this.store.set('settings.projects.paths', newPaths);
      }
    } else if (settings.projects) {
      // Handle direct projects update (from our cleanup code)
      if (settings.projects.current) {
        this.store.set('settings.projects.current', settings.projects.current);
      }
      if (settings.projects.paths) {
        this.store.set('settings.projects.paths', settings.projects.paths);
      }
    }

    // Update default save directory
    if (settings.default_save_dir) {
      this.store.set('settings.default_save_dir', settings.default_save_dir);
    }

    return true;
  }

  async cleanProjectHistory() {
    if (!this.isInitialized || !this.store) {
      throw new Error('Store not initialized. Call init() first.');
    }
    
    // Get current project
    const currentProject = this.store.get('settings.projects.current', null);
    const projectPaths = this.store.get('settings.projects.paths', {});
    const currentProjectPath = currentProject ? (projectPaths[currentProject] || null) : null;
    
    if (currentProject && currentProjectPath) {
      // Reset paths to contain only the current project
      const newPaths = {};
      newPaths[currentProject] = currentProjectPath;
      this.store.set('settings.projects.paths', newPaths);
      console.log('Project history cleaned successfully');
      return true;
    }
    
    return false;
  }

  // Get Claude API settings
  getClaudeApiSettings() {
    return this.store.get('settings.claude_api', {});
  }

  // Return the schema for Claude API settings
  getClaudeApiSettingsSchema() {
    return [
      {
        name: 'max_retries',
        label: 'Max Retries',
        type: 'number',
        min: 0,
        max: 5,
        step: 1,
        default: 1,
        required: true,
        description: 'Maximum number of retry attempts if the API call fails.'
      },
      {
        name: 'request_timeout',
        label: 'Request Timeout (seconds)',
        type: 'number',
        min: 30,
        max: 600,
        step: 30,
        default: 300,
        required: true,
        description: 'Maximum time (in seconds) to wait for a response from the API.'
      },
      {
        name: 'context_window',
        label: 'Context Window (tokens)',
        type: 'number',
        min: 50000,
        max: 200000,
        step: 10000,
        default: 200000,
        required: true,
        description: 'Maximum number of tokens for the context window.'
      },
      {
        name: 'thinking_budget_tokens',
        label: 'Thinking Budget (tokens)',
        type: 'number',
        min: 1000,
        max: 100000,
        step: 1000,
        default: 32000,
        required: true,
        description: 'Maximum tokens for model thinking.'
      },
      {
        name: 'betas_max_tokens',
        label: 'Betas Max Tokens',
        type: 'number',
        min: 10000,
        max: 200000,
        step: 1000,
        default: 128000,
        required: true,
        description: 'Maximum tokens for beta features.'
      },
      {
        name: 'desired_output_tokens',
        label: 'Desired Output Tokens',
        type: 'number',
        min: 1000,
        max: 30000,
        step: 1000,
        default: 12000,
        required: true,
        description: 'Target number of tokens for the model\'s output.'
      }
    ];
  }
}

// Export a singleton instance
const databaseInstance = new Database();

module.exports = databaseInstance;
