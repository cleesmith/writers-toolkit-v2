// Get elements
const themeToggleBtn = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');
const quitButton = document.getElementById('quit-button');
const apiSettingsBtn = document.getElementById('api-settings-btn');
const body = document.body;

// Track theme state (initially dark)
let isDarkMode = true;

// Function to get a human-readable timestamp
function getReadableTimestamp() {
  const date = new Date();
  
  // Get day of week (abbreviated)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = daysOfWeek[date.getDay()];
  
  // Get month (abbreviated)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  
  // Get day and year
  const day = date.getDate();
  const year = date.getFullYear();
  
  // Get hours in 12-hour format
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12
  
  // Get minutes
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  // Construct the readable timestamp
  return `${dayOfWeek} ${month} ${day}, ${year} ${hours}:${minutes}${ampm}`;
}

// Function to update the timestamp display
function updateTimestamp() {
  const timestampElement = document.getElementById('timestamp');
  if (timestampElement) {
    timestampElement.textContent = getReadableTimestamp();
  }
}

// Update icon visibility based on the current theme
function updateThemeIcons() {
  if (isDarkMode) {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  } else {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  }
}

// Initialize icons on page load
updateThemeIcons();

// Toggle between dark and light mode
themeToggleBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  
  if (isDarkMode) {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
  }
  
  // Update icons when theme changes
  updateThemeIcons();
});

// Quit application when quit button is clicked
quitButton.addEventListener('click', () => {
  window.electronAPI.quitApp();
});

// Project selection functionality
const selectProjectBtn = document.getElementById('select-project-btn');
const currentProjectName = document.getElementById('current-project-name');
const currentProjectPath = document.getElementById('current-project-path');

// Tool selection functionality
const toolSelect = document.getElementById('tool-select');
const toolDescription = document.getElementById('tool-description');
const setupRunBtn = document.getElementById('setup-run-btn');

// Load current project info when the app starts
async function loadProjectInfo() {
  try {
    const projectInfo = await window.electronAPI.getProjectInfo();
    updateProjectDisplay(projectInfo);
  } catch (error) {
    console.error('Error loading project info:', error);
  }
}

// Update the project display in the UI
function updateProjectDisplay(projectInfo) {
  if (projectInfo && projectInfo.current_project) {
    currentProjectName.textContent = projectInfo.current_project;
    currentProjectName.classList.remove('no-project');
    
    if (projectInfo.current_project_path) {
      currentProjectPath.textContent = `Project Path: ${projectInfo.current_project_path}`;
      currentProjectPath.style.display = 'block';
    } else {
      currentProjectPath.style.display = 'none';
    }
  } else {
    currentProjectName.textContent = 'No project selected';
    currentProjectName.classList.add('no-project');
    currentProjectPath.style.display = 'none';
  }
}

// Handle the select project button click
selectProjectBtn.addEventListener('click', () => {
  window.electronAPI.selectProject();
});

// Listen for project updates from the main process
window.electronAPI.onProjectUpdated((event) => {
  if (event.project) {
    updateProjectDisplay({
      current_project: event.project.projectName,
      current_project_path: event.project.projectPath
    });
    
    // Reload tools list after project change
    loadTools();
  }
});

// Load the list of tools
async function loadTools() {
  try {
    const tools = await window.electronAPI.getTools();
    
    // Clear any existing options
    toolSelect.innerHTML = '';
    
    // Define tool categories
    const topTools = ["tokens_words_counter", "narrative_integrity", "manuscript_to_outline_characters_world", "brainstorm"];
    const roughDraftTools = ["brainstorm", "outline_writer", "world_writer", "chapter_writer"];
    
    // Track which tools have been added to avoid duplicates
    const addedTools = new Set();
    
    // First add the top tools (first 2 only - brainstorm will go in rough draft section)
    tools.forEach(tool => {
      if (topTools.includes(tool.name) && tool.name !== "brainstorm") {
        const option = document.createElement('option');
        option.value = tool.name;
        option.textContent = tool.title;
        option.dataset.description = tool.description;
        toolSelect.appendChild(option);
        addedTools.add(tool.name);
      }
    });
    
    // Add the "Rough Draft Writing Tools" header
    const roughDraftHeader = document.createElement('option');
    roughDraftHeader.disabled = true;
    roughDraftHeader.value = '';
    roughDraftHeader.textContent = '- Rough Draft Writing Tools:';
    roughDraftHeader.style.color = '#999';
    roughDraftHeader.style.fontWeight = 'bold';
    roughDraftHeader.style.backgroundColor = '#252525';
    roughDraftHeader.style.padding = '2px';
    toolSelect.appendChild(roughDraftHeader);
    
    // Add the rough draft tools
    tools.forEach(tool => {
      if (roughDraftTools.includes(tool.name)) {
        const option = document.createElement('option');
        option.value = tool.name;
        option.textContent = tool.title;
        option.dataset.description = tool.description;
        toolSelect.appendChild(option);
        addedTools.add(tool.name);
      }
    });
    
    // Add the "Editor Tools" header
    const editorHeader = document.createElement('option');
    editorHeader.disabled = true;
    editorHeader.value = '';
    editorHeader.textContent = '- Editor Tools:';
    editorHeader.style.color = '#999';
    editorHeader.style.fontWeight = 'bold';
    editorHeader.style.backgroundColor = '#252525';
    editorHeader.style.padding = '2px';
    toolSelect.appendChild(editorHeader);
    
    // Add all remaining tools that haven't been added yet
    tools.forEach(tool => {
      if (!addedTools.has(tool.name)) {
        const option = document.createElement('option');
        option.value = tool.name;
        option.textContent = tool.title;
        option.dataset.description = tool.description;
        toolSelect.appendChild(option);
      }
    });
    
    // Select the first tool by default
    if (tools.length > 0) {
      toolSelect.value = tools[0].name;
      toolDescription.textContent = tools[0].description;
    } else {
      toolDescription.textContent = 'No tools available.';
    }
  } catch (error) {
    console.error('Error loading tools:', error);
    toolDescription.textContent = 'Error loading tools.';
  }
}

// Update the description when a different tool is selected
toolSelect.addEventListener('change', () => {
  const selectedOption = toolSelect.options[toolSelect.selectedIndex];
  if (selectedOption) {
    toolDescription.textContent = selectedOption.dataset.description || 'No description available.';
  }
});

// Handle the Setup & Run button
setupRunBtn.addEventListener('click', () => {
  const selectedTool = toolSelect.value;
  if (!selectedTool) {
    alert('Please select a tool first.');
    return;
  }
  
  // Launch the tool setup dialog with the current selection
  window.electronAPI.showToolSetupDialog(selectedTool);
});

// Editor button handler
const openEditorBtn = document.getElementById('open-editor-btn');
if (openEditorBtn) {
  openEditorBtn.addEventListener('click', async () => {
    try {
      const success = await window.electronAPI.launchEditor();
      if (!success) {
        console.error('Failed to launch editor');
        // You could show an error notification here if you have one
      }
    } catch (error) {
      console.error('Error launching editor:', error);
    }
  });
}

// Open API Settings dialog
if (apiSettingsBtn) {
  apiSettingsBtn.addEventListener('click', () => {
    window.electronAPI.showApiSettingsDialog();
  });
}

// Listen for API settings updates
window.electronAPI.onApiSettingsUpdated((settings) => {
  console.log('API settings updated:', settings);
  // Could refresh any UI that depends on these settings
});

// Add this to your DOMContentLoaded event listener in renderer.js:
document.addEventListener('DOMContentLoaded', () => {
  // Create timestamp element
  const timestampElement = document.createElement('div');
  timestampElement.id = 'timestamp';
  timestampElement.className = 'timestamp';
  timestampElement.textContent = getReadableTimestamp();
  
  // Find the header-center div and add the timestamp alongside the h1
  const headerCenter = document.querySelector('.header-center');
  if (headerCenter) {
    // Add timestamp after the h1
    headerCenter.appendChild(timestampElement);
  }

  // Update the timestamp once per minute
  setInterval(updateTimestamp, 60000);  

  // Rest of your existing initialization code
  loadProjectInfo();
  loadTools();
});

// Add this to listen for when a tool run finishes and the window gains focus again
// This updates the timestamp when returning to the main window
window.addEventListener('focus', updateTimestamp);

// Also listen for tool dialog closing events from the main process
// Add this where you have other electronAPI event listeners:
if (window.electronAPI && window.electronAPI.onToolDialogClosed) {
  window.electronAPI.onToolDialogClosed(() => {
    updateTimestamp();
  });
}
