// API Base URL
const API_BASE = '/api';

// State
let currentTab = 'agents';
let agents = [];
let workflows = [];
let tools = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModals();
  checkHealth();
  loadData();
  setupEventListeners();
});

// Tab Navigation
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');

  currentTab = tabName;

  // Load data for the tab
  if (tabName === 'agents') loadAgents();
  else if (tabName === 'workflows') loadWorkflows();
  else if (tabName === 'tools') loadTools();
  else if (tabName === 'memory') loadMemoryStats();
  else if (tabName === 'execute') loadExecuteOptions();
}

// Health Check
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();

    const indicator = document.getElementById('healthIndicator');
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('.status-text');

    if (data.success && data.data.healthy) {
      dot.classList.add('healthy');
      text.textContent = 'Healthy';
    } else {
      dot.classList.add('unhealthy');
      text.textContent = 'Unhealthy';
    }
  } catch (error) {
    const indicator = document.getElementById('healthIndicator');
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('.status-text');
    dot.classList.add('unhealthy');
    text.textContent = 'Error';
  }

  // Check again in 30 seconds
  setTimeout(checkHealth, 30000);
}

// Load Data
function loadData() {
  loadAgents();
}

// Agents
async function loadAgents() {
  const container = document.getElementById('agentsList');
  container.innerHTML = '<div class="loading">Loading agents...</div>';

  try {
    const response = await fetch(`${API_BASE}/agents`);
    const data = await response.json();

    if (data.success) {
      agents = data.data;
      displayAgents(agents);
    } else {
      container.innerHTML = `<div class="loading" style="color: var(--danger);">Error: ${data.error}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="loading" style="color: var(--danger);">Error loading agents</div>`;
  }
}

function displayAgents(agentList) {
  const container = document.getElementById('agentsList');

  if (agentList.length === 0) {
    container.innerHTML = '<div class="loading">No agents yet. Create your first agent!</div>';
    return;
  }

  container.innerHTML = agentList.map(agent => `
    <div class="card">
      <h3>${escapeHtml(agent.name)}</h3>
      <p>${escapeHtml(agent.description)}</p>
      <div class="card-meta">
        <span class="badge">ID: ${agent.id.substring(0, 8)}...</span>
        ${agent.capabilities && agent.capabilities.length > 0
          ? agent.capabilities.map(cap => `<span class="badge badge-primary">${cap}</span>`).join('')
          : '<span class="badge">No capabilities</span>'
        }
      </div>
    </div>
  `).join('');
}

// Workflows
async function loadWorkflows() {
  const container = document.getElementById('workflowsList');
  container.innerHTML = '<div class="loading">Loading workflows...</div>';

  try {
    const response = await fetch(`${API_BASE}/workflows`);
    const data = await response.json();

    if (data.success) {
      workflows = data.data;
      displayWorkflows(workflows);
    } else {
      container.innerHTML = `<div class="loading" style="color: var(--danger);">Error: ${data.error}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="loading" style="color: var(--danger);">Error loading workflows</div>`;
  }
}

function displayWorkflows(workflowList) {
  const container = document.getElementById('workflowsList');

  if (workflowList.length === 0) {
    container.innerHTML = '<div class="loading">No workflows yet.</div>';
    return;
  }

  container.innerHTML = workflowList.map(workflow => `
    <div class="card">
      <h3>${escapeHtml(workflow.name)}</h3>
      <p>${escapeHtml(workflow.description)}</p>
      <div class="card-meta">
        <span class="badge">ID: ${workflow.id.substring(0, 8)}...</span>
        <span class="badge badge-primary">${workflow.steps.length} steps</span>
      </div>
    </div>
  `).join('');
}

// Tools
async function loadTools() {
  const container = document.getElementById('toolsList');
  container.innerHTML = '<div class="loading">Loading tools...</div>';

  try {
    const response = await fetch(`${API_BASE}/tools`);
    const data = await response.json();

    if (data.success) {
      tools = data.data;
      displayTools(tools);
    } else {
      container.innerHTML = `<div class="loading" style="color: var(--danger);">Error: ${data.error}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="loading" style="color: var(--danger);">Error loading tools</div>`;
  }
}

function displayTools(toolList) {
  const container = document.getElementById('toolsList');

  container.innerHTML = toolList.map(tool => `
    <div class="card">
      <h3>${escapeHtml(tool.name)}</h3>
      <p>${escapeHtml(tool.description)}</p>
      <div class="card-meta">
        <span class="badge badge-primary">Built-in</span>
      </div>
    </div>
  `).join('');
}

// Memory
async function loadMemoryStats() {
  const container = document.getElementById('memoryStats');
  container.innerHTML = '<div class="loading">Loading memory stats...</div>';

  try {
    const response = await fetch(`${API_BASE}/memory/stats`);
    const data = await response.json();

    if (data.success) {
      displayMemoryStats(data.data);
    } else {
      container.innerHTML = `<div class="loading" style="color: var(--danger);">Error: ${data.error}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="loading" style="color: var(--danger);">Error loading memory stats</div>`;
  }
}

function displayMemoryStats(stats) {
  const container = document.getElementById('memoryStats');

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${stats.totalEntries}</div>
      <div class="stat-label">Total Memories</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.byType['short-term'] || 0}</div>
      <div class="stat-label">Short-Term</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.byType['long-term'] || 0}</div>
      <div class="stat-label">Long-Term</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.averageAccessCount.toFixed(2)}</div>
      <div class="stat-label">Avg Access Count</div>
    </div>
  `;
}

// Execute
function loadExecuteOptions() {
  const select = document.getElementById('executeAgent');
  select.innerHTML = '<option value="">-- Select an agent --</option>' +
    agents.map(agent => `<option value="${agent.id}">${escapeHtml(agent.name)}</option>`).join('');
}

// Event Listeners
function setupEventListeners() {
  // Create Agent
  document.getElementById('createAgentBtn').addEventListener('click', () => {
    openModal('createAgentModal');
  });

  document.getElementById('createAgentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('agentName').value;
    const description = document.getElementById('agentDescription').value;
    const capabilities = Array.from(document.querySelectorAll('input[name="capability"]:checked'))
      .map(cb => cb.value);

    try {
      const response = await fetch(`${API_BASE}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, capabilities })
      });

      const data = await response.json();

      if (data.success) {
        closeModal('createAgentModal');
        document.getElementById('createAgentForm').reset();
        loadAgents();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error creating agent');
    }
  });

  // Execute Agent
  document.getElementById('executeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const agentId = document.getElementById('executeAgent').value;
    const taskDescription = document.getElementById('executeTask').value;
    const maxIterations = parseInt(document.getElementById('maxIterations').value);
    const toolsInput = document.getElementById('executeTools').value;

    const options = {
      maxIterations,
      ...(toolsInput ? { tools: toolsInput.split(',').map(t => t.trim()) } : {})
    };

    const resultPanel = document.getElementById('executeResult');
    const resultContent = document.getElementById('resultContent');

    resultPanel.style.display = 'block';
    resultContent.innerHTML = '<div class="loading">Executing agent...</div>';

    try {
      const response = await fetch(`${API_BASE}/agents/${agentId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDescription, options })
      });

      const data = await response.json();

      if (data.success) {
        displayExecutionResult(data.data);
      } else {
        resultContent.innerHTML = `<div style="color: var(--danger);">Error: ${escapeHtml(data.error)}</div>`;
      }
    } catch (error) {
      resultContent.innerHTML = `<div style="color: var(--danger);">Error executing agent</div>`;
    }
  });

  // Memory Actions
  document.getElementById('consolidateMemoryBtn').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_BASE}/memory/consolidate`, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        alert(`Consolidated ${data.data.consolidated} memories`);
        loadMemoryStats();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error consolidating memory');
    }
  });

  document.getElementById('clearMemoryBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all memories?')) return;

    try {
      const response = await fetch(`${API_BASE}/memory`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        alert(`Cleared ${data.data.cleared} memories`);
        loadMemoryStats();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error clearing memory');
    }
  });
}

function displayExecutionResult(result) {
  const resultContent = document.getElementById('resultContent');

  const iterationsHtml = result.iterations && result.iterations.length > 0
    ? result.iterations.map((iter, i) => `
        <div class="iteration">
          <div class="iteration-header">
            <strong>Iteration ${iter.number}</strong>
            <span>${new Date(iter.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="iteration-content">
            <p><strong>Action:</strong> ${escapeHtml(iter.action)}</p>
            <p><strong>Observation:</strong> ${escapeHtml(iter.observation)}</p>
          </div>
        </div>
      `).join('')
    : '<p>No iterations recorded</p>';

  resultContent.innerHTML = `
    <div class="result-content">
      <p><strong>Success:</strong> ${result.success ? 'Yes' : 'No'}</p>
      <p><strong>Output:</strong> ${escapeHtml(String(result.output))}</p>
      <p><strong>Duration:</strong> ${result.metadata.duration}ms</p>
      <p><strong>Iterations:</strong> ${result.iterations.length}</p>
    </div>
    <h4 style="margin-top: 20px; margin-bottom: 10px;">Execution Steps:</h4>
    ${iterationsHtml}
  `;
}

// Modal Helpers
function initModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
