
/**
 * ============================================
 * ColabBridge Dashboard - Main Application
 * ============================================
 * A complete frontend for the ColabBridge API
 * Built with vanilla JavaScript, HTML, CSS
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    API_BASE: 'https://colabbridge-ldys.onrender.com',
    DEFAULT_LANGUAGE: 'python',
    CODE_PLACEHOLDER: '# Write your Python code here\n\nprint("Hello, ColabBridge!")\n\n# Example: Simple calculation\nresult = sum(i**2 for i in range(10))\nprint(f"Sum of squares: {result}")',
    TOAST_DURATION: 5000,
    REFRESH_INTERVAL: 30000,
};

// ============================================
// STATE
// ============================================
const state = {
    sessions: [],
    currentPage: 'dashboard',
    selectedSessionId: null,
    editorLanguage: 'python',
    isExecuting: false,
    uploadFile: null,
    apiStatus: 'loading',
};

// ============================================
// DOM REFS
// ============================================
const DOM = {
    sidebar: document.getElementById('sidebar'),
    pageContent: document.getElementById('pageContent'),
    pageTitle: document.getElementById('pageTitle'),
    toastContainer: document.getElementById('toastContainer'),
    apiStatusDot: document.getElementById('apiStatusDot'),
    apiStatusText: document.getElementById('apiStatusText'),
    refreshBtn: document.getElementById('refreshBtn'),
    menuBtn: document.getElementById('menuBtn'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    navLinks: document.querySelectorAll('.nav-link'),
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info', title = '') {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type] || 'Info'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close toast">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => removeToast(toast), CONFIG.TOAST_DURATION);
}

function removeToast(toast) {
    if (toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 300);
}

// ============================================
// API CLIENT
// ============================================
async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
        },
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = data.error || data.message || `HTTP ${response.status}`;
            throw new Error(errorMsg);
        }

        return data;
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('Cannot connect to the server. Please check your internet connection.');
        }
        throw error;
    }
}

// ============================================
// API STATUS CHECK
// ============================================
async function checkApiStatus() {
    const dot = DOM.apiStatusDot;
    const text = DOM.apiStatusText;

    dot.className = 'status-dot loading';
    text.textContent = 'Checking...';

    try {
        const data = await apiRequest('/health');
        dot.className = 'status-dot online';
        text.textContent = `Online • ${data.activeSessions || 0} sessions`;
        state.apiStatus = 'online';
        return true;
    } catch (error) {
        dot.className = 'status-dot offline';
        text.textContent = 'Offline';
        state.apiStatus = 'offline';
        showToast('API server is offline', 'error');
        return false;
    }
}

// ============================================
// ROUTING / PAGE RENDERER
// ============================================
function navigateTo(page) {
    state.currentPage = page;

    // Update nav
    DOM.navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        health: 'Health Status',
        sessions: 'Sessions',
        editor: 'Code Editor',
        upload: 'Upload Files',
        download: 'Download Files',
        settings: 'Settings',
    };
    DOM.pageTitle.textContent = titles[page] || page;

    // Render page
    const renderers = {
        dashboard: renderDashboard,
        health: renderHealth,
        sessions: renderSessions,
        editor: renderEditor,
        upload: renderUpload,
        download: renderDownload,
        settings: renderSettings,
    };

    if (renderers[page]) {
        renderers[page]();
    }

    // Close mobile sidebar
    DOM.sidebar.classList.remove('open');
}

// ============================================
// DASHBOARD
// ============================================
function renderDashboard() {
    DOM.pageContent.innerHTML = `
        <div class="page active" id="page-dashboard">
            <div class="page-header">
                <h2>Dashboard</h2>
                <p>Overview of your ColabBridge sessions and system status</p>
            </div>

            <div class="grid-4" id="dashboardStats">
                <div class="stat-card">
                    <div class="stat-label">Active Sessions</div>
                    <div class="stat-value" id="statSessions">—</div>
                    <div class="stat-change">Max: 3</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Executions</div>
                    <div class="stat-value" id="statExecutions">—</div>
                    <div class="stat-change">All time</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Memory Usage</div>
                    <div class="stat-value" id="statMemory">—</div>
                    <div class="stat-change">Heap used</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Uptime</div>
                    <div class="stat-value" id="statUptime">—</div>
                    <div class="stat-change">Since start</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Quick Actions</div>
                        <div class="card-subtitle">Common operations at your fingertips</div>
                    </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                    <button class="btn btn-primary" onclick="navigateTo('sessions')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2"/>
                            <path d="M8 21H16M12 17V21"/>
                        </svg>
                        Manage Sessions
                    </button>
                    <button class="btn btn-success" onclick="navigateTo('editor')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="16 18 22 12 16 6"/>
                            <polyline points="8 6 2 12 8 18"/>
                        </svg>
                        Code Editor
                    </button>
                    <button class="btn btn-secondary" onclick="navigateTo('upload')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
                            <path d="M17 8L12 3L7 8"/>
                            <path d="M12 3V15"/>
                        </svg>
                        Upload Files
                    </button>
                    <button class="btn btn-secondary" onclick="navigateTo('download')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
                            <path d="M7 10L12 15L17 10"/>
                            <path d="M12 15V3"/>
                        </svg>
                        Download Files
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Recent Sessions</div>
                        <div class="card-subtitle">Your active Colab sessions</div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="refreshDashboard()">Refresh</button>
                </div>
                <div id="recentSessions">
                    <div class="spinner-overlay">
                        <span class="spinner"></span>
                        Loading sessions...
                    </div>
                </div>
            </div>
        </div>
    `;

    refreshDashboard();
}

async function refreshDashboard() {
    try {
        const data = await apiRequest('/sessions');
        const stats = document.getElementById('dashboardStats');
        const recent = document.getElementById('recentSessions');

        document.getElementById('statSessions').textContent = data.totalSessions || 0;
        document.getElementById('statExecutions').textContent = data.totalExecutions || 0;
        document.getElementById('statMemory').textContent = data.memoryUsage?.heapUsed || '—';
        document.getElementById('statUptime').textContent = formatUptime(data.uptime);

        if (data.sessions?.length > 0) {
            recent.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Session ID</th>
                                <th>Status</th>
                                <th>GPU</th>
                                <th>Cells</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.sessions.map(s => `
                                <tr>
                                    <td><code style="font-size:12px;color:var(--text-secondary)">${s.sessionId?.substring(0, 12) || '—'}</code></td>
                                    <td><span class="status-badge ${s.status}"><span class="dot"></span>${s.status || 'unknown'}</span></td>
                                    <td>${s.gpu || 'CPU'}</td>
                                    <td>${s.cellsExecuted || 0}</td>
                                    <td>${formatTime(s.createdAt)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            recent.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <path d="M8 21H16M12 17V21"/>
                    </svg>
                    <h3>No active sessions</h3>
                    <p>Create a new session to get started with Colab.</p>
                    <button class="btn btn-primary mt-12" onclick="navigateTo('sessions')">Create Session</button>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('recentSessions').innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8V12M12 16H12.01"/>
                </svg>
                <h3>Failed to load sessions</h3>
                <p>${error.message}</p>
            </div>
        `;
        showToast('Failed to load sessions: ' + error.message, 'error');
    }
}

// ============================================
// HEALTH PAGE
// ============================================
function renderHealth() {
    DOM.pageContent.innerHTML = `
        <div class="page active" id="page-health">
            <div class="page-header">
                <h2>Health Status</h2>
                <p>Real-time health monitoring of the ColabBridge API</p>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">System Status</div>
                    </div>
                    <div id="healthStatus">
                        <div class="spinner-overlay">
                            <span class="spinner"></span>
                            Checking health...
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">System Resources</div>
                    </div>
                    <div id="healthResources">
                        <div class="spinner-overlay">
                            <span class="spinner"></span>
                            Loading resources...
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">API Information</div>
                    <button class="btn btn-sm btn-secondary" onclick="refreshHealth()">Refresh</button>
                </div>
                <div id="healthApiInfo" style="font-size: 14px; color: var(--text-secondary); line-height: 1.8;">
                    <div class="spinner-overlay">
                        <span class="spinner"></span>
                        Loading API info...
                    </div>
                </div>
            </div>
        </div>
    `;

    refreshHealth();
}

async function refreshHealth() {
    try {
        const data = await apiRequest('/health');

        // System Status
        const statusEl = document.getElementById('healthStatus');
        const statusIcon = data.status === 'healthy' ? '✅' : '⚠️';
        const statusColor = data.status === 'healthy' ? 'var(--success)' : 'var(--warning)';
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px; padding: 8px 0;">
                <div style="font-size: 48px;">${statusIcon}</div>
                <div>
                    <div style="font-size: 20px; font-weight: 600; color: ${statusColor};">${data.status || 'unknown'}</div>
                    <div style="color: var(--text-secondary); font-size: 14px;">
                        ${data.activeSessions || 0} active sessions • ${data.queuedExecutions || 0} queued
                    </div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; font-size: 14px;">
                <div><span style="color: var(--text-secondary);">Colab Binary:</span> ${data.colabBinary || '—'}</div>
                <div><span style="color: var(--text-secondary);">Python Module:</span> ${data.usePythonModule ? '✅' : '❌'}</div>
                <div><span style="color: var(--text-secondary);">Max Sessions:</span> ${data.maxSessions || 3}</div>
                <div><span style="color: var(--text-secondary);">Completed Executions:</span> ${data.completedExecutions || 0}</div>
            </div>
        `;

        // Resources
        const resourcesEl = document.getElementById('healthResources');
        const mem = data.memoryUsage || {};
        resourcesEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 8px 0;">
                <div>
                    <div style="color: var(--text-secondary); font-size: 13px;">RSS</div>
                    <div style="font-size: 18px; font-weight: 600;">${mem.rss || '—'}</div>
                </div>
                <div>
                    <div style="color: var(--text-secondary); font-size: 13px;">Heap Total</div>
                    <div style="font-size: 18px; font-weight: 600;">${mem.heapTotal || '—'}</div>
                </div>
                <div>
                    <div style="color: var(--text-secondary); font-size: 13px;">Heap Used</div>
                    <div style="font-size: 18px; font-weight: 600;">${mem.heapUsed || '—'}</div>
                </div>
                <div>
                    <div style="color: var(--text-secondary); font-size: 13px;">Uptime</div>
                    <div style="font-size: 18px; font-weight: 600;">${formatUptime(data.uptime)}</div>
                </div>
            </div>
        `;

        // API Info
        const apiInfoEl = document.getElementById('healthApiInfo');
        apiInfoEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;">
                <div><span style="color: var(--text-muted);">Status:</span> ${data.status || '—'}</div>
                <div><span style="color: var(--text-muted);">Active Sessions:</span> ${data.activeSessions || 0}</div>
                <div><span style="color: var(--text-muted);">File Transfers:</span> ${data.fileTransfers || 0}</div>
                <div><span style="color: var(--text-muted);">Queued Executions:</span> ${data.queuedExecutions || 0}</div>
                <div><span style="color: var(--text-muted);">Completed Executions:</span> ${data.completedExecutions || 0}</div>
                <div><span style="color: var(--text-muted);">Total Executions:</span> ${data.totalExecutions || 0}</div>
                <div><span style="color: var(--text-muted);">Timestamp:</span> ${formatTime(data.timestamp)}</div>
                <div><span style="color: var(--text-muted);">Version:</span> ${data.version || '—'}</div>
            </div>
        `;

    } catch (error) {
        document.getElementById('healthStatus').innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <h3>❌ Health check failed</h3>
                <p>${error.message}</p>
            </div>
        `;
        document.getElementById('healthResources').innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <p style="color: var(--error);">Failed to load resources</p>
            </div>
        `;
        document.getElementById('healthApiInfo').innerHTML = `
            <div style="color: var(--error);">Failed to load API info: ${error.message}</div>
        `;
        showToast('Health check failed: ' + error.message, 'error');
    }
}

// ============================================
// SESSIONS PAGE
// ============================================
function renderSessions() {
    DOM.pageContent.innerHTML = `
        <div class="page active" id="page-sessions">
            <div class="page-header">
                <h2>Sessions</h2>
                <p>Manage your Colab sessions</p>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="createSession()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5V19M5 12H19"/>
                    </svg>
                    Create Session
                </button>
                <button class="btn btn-secondary" onclick="refreshSessions()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4V10H17"/>
                        <path d="M1 20V14H7"/>
                        <path d="M3.51 9C4.83 5.18 8.56 2 13 2C18.52 2 23 6.48 23 12"/>
                        <path d="M20.49 15C19.17 18.82 15.44 22 11 22C5.48 22 1 17.52 1 12"/>
                    </svg>
                    Refresh
                </button>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Active Sessions</div>
                        <div class="card-subtitle" id="sessionCount">Loading...</div>
                    </div>
                </div>
                <div id="sessionsList">
                    <div class="spinner-overlay">
                        <span class="spinner"></span>
                        Loading sessions...
                    </div>
                </div>
            </div>
        </div>
    `;

    refreshSessions();
}

async function refreshSessions() {
    const listEl = document.getElementById('sessionsList');
    const countEl = document.getElementById('sessionCount');

    try {
        const data = await apiRequest('/sessions');
        countEl.textContent = `${data.totalSessions || 0} active sessions (max ${data.maxSessions || 3})`;
        state.sessions = data.sessions || [];

        if (state.sessions.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <path d="M8 21H16M12 17V21"/>
                    </svg>
                    <h3>No sessions</h3>
                    <p>Create a new session to get started.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Session ID</th>
                            <th>Colab Session</th>
                            <th>Status</th>
                            <th>GPU</th>
                            <th>Cells</th>
                            <th>Active</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.sessions.map(s => `
                            <tr>
                                <td><code style="font-size:12px;color:var(--text-secondary)">${s.sessionId?.substring(0, 12) || '—'}</code></td>
                                <td style="font-size:13px;color:var(--text-secondary)">${s.colabSession || '—'}</td>
                                <td><span class="status-badge ${s.status}"><span class="dot"></span>${s.status || 'unknown'}</span></td>
                                <td>${s.gpu || 'CPU'}</td>
                                <td>${s.cellsExecuted || 0}</td>
                                <td style="font-size:13px;color:var(--text-secondary)">${s.activeMinutes || 0}m</td>
                                <td>
                                    <button class="btn btn-sm btn-danger" onclick="deleteSession('${s.sessionId}')">Delete</button>
                                    <button class="btn btn-sm btn-secondary" onclick="keepAliveSession('${s.sessionId}')">Keep Alive</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        listEl.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8V12M12 16H12.01"/>
                </svg>
                <h3>Failed to load sessions</h3>
                <p>${error.message}</p>
            </div>
        `;
        showToast('Failed to load sessions: ' + error.message, 'error');
    }
}

async function createSession() {
    try {
        showToast('Creating session...', 'info', 'Please wait');
        const data = await apiRequest('/sessions', {
            method: 'POST',
            body: JSON.stringify({ gpu: 'T4' }),
        });

        if (data.success) {
            showToast(`Session created: ${data.sessionId?.substring(0, 12) || 'success'}`, 'success');
            refreshSessions();
        } else {
            showToast(data.error || 'Failed to create session', 'error');
        }
    } catch (error) {
        showToast('Failed to create session: ' + error.message, 'error');
    }
}

async function deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
        showToast('Deleting session...', 'info', 'Please wait');
        const data = await apiRequest(`/session/${sessionId}`, {
            method: 'DELETE',
        });

        if (data.success) {
            showToast('Session deleted successfully', 'success');
            refreshSessions();
        } else {
            showToast(data.error || 'Failed to delete session', 'error');
        }
    } catch (error) {
        showToast('Failed to delete session: ' + error.message, 'error');
    }
}

async function keepAliveSession(sessionId) {
    try {
        showToast('Sending keep-alive...', 'info', 'Please wait');
        const data = await apiRequest('/keepalive', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
        });

        if (data.success) {
            showToast('Session kept alive', 'success');
            refreshSessions();
        } else {
            showToast(data.error || 'Failed to keep session alive', 'error');
        }
    } catch (error) {
        showToast('Failed to keep session alive: ' + error.message, 'error');
    }
}

// ============================================
// EDITOR PAGE
// ============================================
function renderEditor() {
    DOM.pageContent.innerHTML = `
        <div class="page active" id="page-editor">
            <div class="page-header">
                <h2>Code Editor</h2>
                <p>Write and execute Python code on Colab</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Session</div>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0;">
                        <label>Select Session</label>
                        <select id="editorSessionSelect">
                            <option value="">— Select a session —</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex:0 0 150px;">
                        <label>Cell Number</label>
                        <input type="number" id="editorCellNo" value="1" min="1" />
                    </div>
                    <div class="form-group" style="flex:0 0 150px;">
                        <label>Timeout (s)</label>
                        <input type="number" id="editorTimeout" value="60" min="5" />
                    </div>
                    <div style="display:flex;align-items:flex-end;gap:8px;">
                        <button class="btn btn-primary" onclick="executeCode()" id="executeBtn">
                            ▶ Run Code
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Code</div>
                </div>
                <div class="editor-wrapper">
                    <div class="editor-toolbar">
                        <span style="font-size:13px;color:var(--text-secondary);">Language:</span>
                        <select id="editorLanguage">
                            <option value="python">Python</option>
                        </select>
                        <span style="font-size:13px;color:var(--text-secondary);margin-left:8px;">Line:</span>
                        <span id="editorLineCount" style="font-size:13px;color:var(--text-secondary);">1</span>
                        <button class="btn btn-sm btn-secondary" onclick="formatEditorCode()" style="margin-left:auto;">
                            Format
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="clearEditorOutput()">Clear Output</button>
                    </div>
                    <textarea 
                        class="editor-textarea" 
                        id="editorCode" 
                        spellcheck="false"
                        placeholder="${CONFIG.CODE_PLACEHOLDER}"
                    >${CONFIG.CODE_PLACEHOLDER}</textarea>
                    <div class="editor-output" id="editorOutput">
                        <div class="output-label">
                            <span>📤 Output</span>
                            <span id="executionStatus" style="font-size:12px;color:var(--text-muted);"></span>
                        </div>
                        <div class="output-content" id="outputContent">Ready to execute code...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load sessions into dropdown
    loadSessionsIntoDropdown();

    // Line counter for editor
    const editor = document.getElementById('editorCode');
    editor.addEventListener('input', function() {
        document.getElementById('editorLineCount').textContent = this.value.split('\n').length;
    });
    editor.addEventListener('keydown', function(e) {
        // Tab key support
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
}

async function loadSessionsIntoDropdown() {
    const select = document.getElementById('editorSessionSelect');
    try {
        const data = await apiRequest('/sessions');
        const sessions = data.sessions || [];

        select.innerHTML = `
            <option value="">— Select a session —</option>
            ${sessions.map(s => `
                <option value="${s.sessionId}">${s.sessionId?.substring(0, 12) || 'unknown'} (${s.status || 'unknown'})</option>
            `).join('')}
        `;

        if (sessions.length > 0) {
            select.value = sessions[0].sessionId;
            state.selectedSessionId = sessions[0].sessionId;
        }
    } catch (error) {
        showToast('Failed to load sessions: ' + error.message, 'error');
    }
}

async function executeCode() {
    const sessionId = document.getElementById('editorSessionSelect').value;
    const code = document.getElementById('editorCode').value;
    const cellNo = parseInt(document.getElementById('editorCellNo').value) || 1;
    const timeout = parseInt(document.getElementById('editorTimeout').value) || 60;
    const outputContent = document.getElementById('outputContent');
    const statusEl = document.getElementById('executionStatus');

    if (!sessionId) {
        showToast('Please select a session first', 'warning');
        return;
    }

    if (!code.trim()) {
        showToast('Please enter some code to execute', 'warning');
        return;
    }

    const btn = document.getElementById('executeBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Executing...';
    outputContent.className = 'output-content';
    outputContent.textContent = '⏳ Executing code...';
    statusEl.textContent = '• Running';

    try {
        const data = await apiRequest('/execute', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                code,
                cellNo,
                timeout,
            }),
        });

        if (data.status === 'processing' && data.executionId) {
            outputContent.textContent = '⏳ Code queued for execution...';
            await pollExecutionStatus(sessionId, data.executionId, outputContent, statusEl);
        } else {
            outputContent.className = 'output-content error';
            outputContent.textContent = data.error || 'Unknown error occurred';
            statusEl.textContent = '• Failed';
            showToast('Execution failed', 'error');
        }
    } catch (error) {
        outputContent.className = 'output-content error';
        outputContent.textContent = `❌ Error: ${error.message}`;
        statusEl.textContent = '• Failed';
        showToast('Execution error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '▶ Run Code';
    }
}

async function pollExecutionStatus(sessionId, executionId, outputEl, statusEl) {
    let attempts = 0;
    const maxAttempts = 120; // 20 minutes at 10s intervals

    while (attempts < maxAttempts) {
        try {
            const params = new URLSearchParams({ sessionId, executionId });
            const data = await apiRequest(`/exec-status?${params}`);

            if (data.status === 'completed') {
                outputEl.className = 'output-content success';
                outputEl.textContent = data.output || '(No output)';
                if (data.error) {
                    outputEl.textContent += '\n\n⚠️ Errors:\n' + data.error;
                }
                statusEl.textContent = '• Completed ✓';
                showToast('Code executed successfully', 'success');
                return;
            } else if (data.status === 'failed') {
                outputEl.className = 'output-content error';
                outputEl.textContent = `❌ Execution failed:\n${data.error || 'Unknown error'}`;
                if (data.output) {
                    outputEl.textContent += `\n\n📤 Output:\n${data.output}`;
                }
                statusEl.textContent = '• Failed ✗';
                showToast('Execution failed', 'error');
                return;
            } else if (data.status === 'running') {
                const elapsed = Math.round((data.elapsed || 0) / 1000);
                statusEl.textContent = `• Running (${elapsed}s)`;
                if (data.partialOutput) {
                    outputEl.textContent = `⏳ Running...\n\n${data.partialOutput}`;
                }
                await new Promise(r => setTimeout(r, CONFIG.REFRESH_INTERVAL));
                attempts++;
            } else {
                // Not found or unknown
                outputEl.className = 'output-content error';
                outputEl.textContent = `❌ Execution status: ${data.status || 'unknown'}`;
                statusEl.textContent = '• Unknown';
                return;
            }
        } catch (error) {
            outputEl.className = 'output-content error';
            outputEl.textContent = `❌ Error polling status: ${error.message}`;
            statusEl.textContent = '• Error';
            return;
        }
    }

    outputEl.className = 'output-content error';
    outputEl.textContent = '⏱️ Execution timed out after 20 minutes';
    statusEl.textContent = '• Timeout';
    showToast('Execution timed out', 'warning');
}

function formatEditorCode() {
    const editor = document.getElementById('editorCode');
    const lines = editor.value.split('\n');
    const formatted = lines
        .map(line => line.trimEnd())
        .join('\n');
    editor.value = formatted;
    showToast('Code formatted', 'success');
}

function clearEditorOutput() {
    const outputEl = document.getElementById('outputContent');
    outputEl.className = 'output-content';
    outputEl.textContent = 'Ready to execute code...';
    document.getElementById('executionStatus').textContent = '';
}

// ============================================
// UPLOAD PAGE
// ============================================
function renderUpload() {
    DOM.pageContent.innerHTML = `
        <div class="page active" id="page-upload">
            <div class="page-header">
                <h2>Upload Files</h2>
                <p>Upload files to your Colab sessions</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Session</div>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0;">
                        <label>Select Session</label>
                        <select id="uploadSessionSelect">
                            <option value="">— Select a session —</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0;">
                        <label>Remote Path</label>
                        <input type="text" id="uploadRemotePath" placeholder="/content/myfile.txt" value="/content/" />
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">File Upload</div>
                </div>
                <div 
                    id="dropZone"
                    style="
                        border: 2px dashed var(--border-color);
                        border-radius: var(--radius);
                        padding: 40px;
                        text-align: center;
                        cursor: pointer;
                        transition: all var(--transition);
                        background: var(--bg-primary);
                    "
                    ondragover="handleDragOver(event)"
                    ondragleave="handleDragLeave(event)"
                    ondrop="handleDrop(event)"
                    onclick="document.getElementById('fileInput').click()"
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                        <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
                        <path d="M17 8L12 3L7 8"/>
                        <path d="M12 3V15"/>
                    </svg>
                    <h3 style="margin: 12px 0 4px;">Drop files here or click to browse</h3>
                    <p style="color: var(--text-secondary); font-size: 14px;">Maximum file size: 100 MB</p>
                    <input 
                        type="file" 
                        id="fileInput" 
                        style="display:none;" 
                        onchange="handleFileSelect(event)"
                    />
                </div>
                <div id="uploadFileInfo" style="margin-top: 12px; display: none;">
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-primary); border-radius: var(--radius); border: 1px solid var(--border-color);">
                        <span style="font-size: 24px;">📄</span>
                        <div style="flex:1;">
                            <div style="font-weight: 500;" id="uploadFileName">file.txt</div>
                            <div style="font-size: 13px; color: var(--text-secondary);" id="uploadFileSize">0 bytes</div>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="clearFileSelection()">Remove</button>
                    </div>
                </div>
                <button class="btn btn-primary mt-16" onclick="uploadFile()" id="uploadBtn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
                        <path d="M17 8L12 3L7 8"/>
                        <path d="M12 3V15"/>
                    </svg>
                    Upload File
                </button>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Upload History</div>
                    <button class="btn btn-sm btn-secondary" onclick="refreshUploads()">Refresh</button>
                </div>
                <div id="uploadHistory">
                    <div class="empty-state">
                        <p>No uploads yet. Upload a file to get started.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadSessionsIntoDropdown('uploadSessionSelect');
}

let selectedFile = null;

function handleDragOver(e) {
    e.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.style.borderColor = 'var(--accent)';
    dropZone.style.background = 'var(--accent-dim)';
}

function handleDragLeave(e) {
    e.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.style.borderColor = 'var(--border-color)';
    dropZone.style.background = 'var(--bg-primary)';
}

function handleDrop(e) {
    e.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.style.borderColor = 'var(--border-color)';
    dropZone.style.background = 'var(--bg-primary)';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processSelectedFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processSelectedFile(file);
    }
}

function processSelectedFile(file) {
    if (file.size > 100 * 1024 * 1024) {
        showToast('File exceeds 100 MB limit', 'error');
        return;
    }
    selectedFile = file;
    const infoEl = document.getElementById('uploadFileInfo');
    infoEl.style.display = 'block';
    document.getElementById('uploadFileName').textContent = file.name;
    document.getElementById('uploadFileSize').textContent = formatFileSize(file.size);
}

function clearFileSelection() {
    selectedFile = null;
    document.getElementById('uploadFileInfo').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

async function uploadFile() {
    const sessionId = document.getElementById('uploadSessionSelect').value;
    const remotePath = document.getElementById('uploadRemotePath').value.trim();

    if (!sessionId) {
        showToast('Please select a session', 'warning');
        return;
    }

    if (!selectedFile) {
        showToast('Please select a file to upload', 'warning');
        return;
    }

    const btn = document.getElementById('uploadBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Uploading...';

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('sessionId', sessionId);
        if (remotePath) {
            const fullPath = remotePath.endsWith('/') ? remotePath + selectedFile.name : remotePath;
            formData.append('remotePath', fullPath);
        }

        const response = await fetch(`${CONFIG.API_BASE}/upload`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type - browser will set with boundary
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Upload failed');
        }

        if (data.success) {
            showToast(`File "${selectedFile.name}" uploaded successfully`, 'success');
            clearFileSelection();
            refreshUploads();
        } else {
            showToast(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
                <path d="M17 8L12 3L7 8"/>
                <path d="M12 3V15"/>
            </svg>
            Upload File
        `;
    }
}

async function refreshUploads() {
    // This would require a proper upload history endpoint
    // For now, we'll just show a message
    const historyEl = document.getElementById('uploadHistory');
    historyEl.innerHTML = `
        <div class="empty-state">
            <p>Upload history will appear here. (Requires backend endpoint)</p>
        </div>
    `;
}

// ============================================
// DOWNLOAD PAGE
// ============================================
function renderDownload() {
    DOM.pageContent.innerHTML = `
        <div class="page active" id="page-download">
            <div class="page-header">
                <h2>Download Files</h2>
                <p>Download files from your Colab sessions</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Download File</div>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0;">
                        <label>Session</label>
                        <select id="downloadSessionSelect">
                            <option value="">— Select a session —</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex:2;min-width:250px;margin-bottom:0;">
                        <label>Remote File Path</label>
                        <input type="text" id="downloadRemotePath" placeholder="/content/myfile.txt" />
                    </div>
                    <div style="display:flex;align-items:flex-end;">
                        <button class="btn btn-primary" onclick="downloadFile()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
                                <path d="M7 10L12 15L17 10"/>
                                <path d="M12 15V3"/>
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Available Files</div>
                    <button class="btn btn-sm btn-secondary" onclick="listFiles()">List Files</button>
                </div>
                <div id="downloadFileList">
                    <div class="empty-state">
                        <p>Enter a session and click "List Files" to see available files.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadSessionsIntoDropdown('downloadSessionSelect');
}

async function listFiles() {
    const sessionId = document.getElementById('downloadSessionSelect').value;
    const fileListEl = document.getElementById('downloadFileList');

    if (!sessionId) {
        showToast('Please select a session', 'warning');
        return;
    }

    fileListEl.innerHTML = `
        <div class="spinner-overlay">
            <span class="spinner"></span>
            Listing files...
        </div>
    `;

    try {
        const params = new URLSearchParams({ sessionId, path: 'content' });
        const data = await apiRequest(`/ls?${params}`);

        if (data.success && data.files) {
            if (data.files.length === 0) {
                fileListEl.innerHTML = `
                    <div class="empty-state">
                        <p>No files found in /content/</p>
                    </div>
                `;
                return;
            }

            fileListEl.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.files.map(file => `
                                <tr>
                                    <td style="font-size:13px;font-family:monospace;">${file}</td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="downloadSpecificFile('${sessionId}', '${file}')">
                                            Download
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            fileListEl.innerHTML = `
                <div class="empty-state">
                    <p>Failed to list files: ${data.error || 'Unknown error'}</p>
                </div>
            `;
        }
    } catch (error) {
        fileListEl.innerHTML = `
            <div class="empty-state">
                <p style="color: var(--error);">Error: ${error.message}</p>
            </div>
        `;
        showToast('Failed to list files: ' + error.message, 'error');
    }
}

function downloadSpecificFile(sessionId, filename) {
    document.getElementById('downloadRemotePath').value = `/content/${filename}`;
    downloadFile();
}

async function downloadFile() {
    const sessionId = document.getElementById('downloadSessionSelect').value;
    const remotePath = document.getElementById('downloadRemotePath').value.trim();

    if (!sessionId) {
        showToast('Please select a session', 'warning');
        return;
    }

    if (!remotePath) {
        showToast('Please enter a remote file path', 'warning');
        return;
    }

    // Get the filename from the path
    const filename = remotePath.split('/').pop();

    try {
        showToast(`Downloading ${filename}...`, 'info', 'Please wait');

        // First, initiate the download via the API
        const data = await apiRequest('/download', {
            method: 'POST',
            body: JSON.stringify({ sessionId, remotePath }),
        });

        if (data.success && data.transferId) {
            // Poll for completion
            await pollDownloadStatus(data.transferId, filename);
        } else {
            showToast(data.error || 'Download initiation failed', 'error');
        }
    } catch (error) {
        showToast('Download failed: ' + error.message, 'error');
    }
}

async function pollDownloadStatus(transferId, filename) {
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
        try {
            const params = new URLSearchParams({ transferId });
            const data = await apiRequest(`/download-status?${params}`);

            if (data.status === 'completed') {
                // Download the file
                const sessionId = document.getElementById('downloadSessionSelect').value;
                const downloadUrl = `${CONFIG.API_BASE}/retrieve-file?sessionId=${sessionId}&filename=${filename}`;
                window.open(downloadUrl, '_blank');
                showToast('Download completed!', 'success');
                return;
            } else if (data.status === 'failed') {
                showToast(`Download failed: ${data.error || 'Unknown error'}`, 'error');
                return;
            } else if (data.status === 'running' || data.status === 'pending') {
                const progress = data.progress || 0;
                showToast(`Downloading... ${progress}%`, 'info', 'Please wait');
                await new Promise(r => setTimeout(r, CONFIG.REFRESH_INTERVAL));
                attempts++;
            } else {
                showToast(`Download status: ${data.status}`, 'warning');
                return;
            }
        } catch (error) {
            showToast('Error checking download status: ' + error.message, 'error');
            return;
        }
    }

    showToast('Download timed out', 'warning');
}

// ============================================
// SETTINGS PAGE
// ============================================
function renderSettings() {
    DOM.pageContent.innerHTML = `
        <div class="page active" id="page-settings">
            <div class="page-header">
                <h2>Settings</h2>
                <p>Configure your ColabBridge dashboard</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">API Configuration</div>
                </div>
                <div class="form-group">
                    <label>API Base URL</label>
                    <input type="text" id="settingsApiUrl" value="${CONFIG.API_BASE}" readonly style="background:var(--bg-primary);" />
                    <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
                        To change the API URL, edit the CONFIG.API_BASE variable in script.js
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Connection</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="status-dot ${state.apiStatus === 'online' ? 'online' : 'offline'}"></span>
                    <span>${state.apiStatus === 'online' ? 'Connected to API' : 'Disconnected'}</span>
                    <button class="btn btn-sm btn-secondary" onclick="checkApiStatus()">Test Connection</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">About</div>
                </div>
                <div style="font-size:14px;color:var(--text-secondary);line-height:1.8;">
                    <p><strong>ColabBridge Dashboard</strong></p>
                    <p>A complete frontend for the ColabBridge API</p>
                    <p style="margin-top:8px;">
                        Built with vanilla JavaScript, HTML, and CSS.<br />
                        No frameworks used.
                    </p>
                    <p style="margin-top:8px;font-size:13px;color:var(--text-muted);">
                        API: <a href="${CONFIG.API_BASE}" target="_blank" style="color:var(--accent);">${CONFIG.API_BASE}</a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatTime(isoString) {
    if (!isoString) return '—';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleString();
    } catch {
        return '—';
    }
}

function formatUptime(seconds) {
    if (!seconds) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function loadSessionsIntoDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    apiRequest('/sessions')
        .then(data => {
            const sessions = data.sessions || [];
            select.innerHTML = `
                <option value="">— Select a session —</option>
                ${sessions.map(s => `
                    <option value="${s.sessionId}">${s.sessionId?.substring(0, 12) || 'unknown'} (${s.status || 'unknown'})</option>
                `).join('')}
            `;
        })
        .catch(() => {
            // Silently fail - user can still see empty dropdown
        });
}

// ============================================
// NAVIGATION EVENTS
// ============================================
DOM.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) navigateTo(page);
    });
});

DOM.menuBtn.addEventListener('click', () => {
    DOM.sidebar.classList.toggle('open');
});

DOM.sidebarToggle.addEventListener('click', () => {
    DOM.sidebar.classList.toggle('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        const isSidebar = DOM.sidebar.contains(e.target);
        const isMenuBtn = DOM.menuBtn.contains(e.target);
        if (!isSidebar && !isMenuBtn) {
            DOM.sidebar.classList.remove('open');
        }
    }
});

DOM.refreshBtn.addEventListener('click', () => {
    const page = state.currentPage;
    const refreshMap = {
        dashboard: refreshDashboard,
        health: refreshHealth,
        sessions: refreshSessions,
        editor: loadSessionsIntoDropdown.bind(null, 'editorSessionSelect'),
        upload: () => {
            loadSessionsIntoDropdown('uploadSessionSelect');
            refreshUploads();
        },
        download: () => {
            loadSessionsIntoDropdown('downloadSessionSelect');
        },
    };
    if (refreshMap[page]) {
        refreshMap[page]();
        showToast('Refreshed', 'success');
    }
});

// ============================================
// AUTO-REFRESH
// ============================================
setInterval(() => {
    if (state.currentPage === 'dashboard') {
        refreshDashboard();
    } else if (state.currentPage === 'sessions') {
        refreshSessions();
    }
}, CONFIG.REFRESH_INTERVAL);

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    // Check API status
    await checkApiStatus();

    // Render dashboard by default
    navigateTo('dashboard');

    // Start periodic API status check
    setInterval(checkApiStatus, 60000);

    console.log('🚀 ColabBridge Dashboard initialized');
    console.log(`📡 API Base: ${CONFIG.API_BASE}`);
    console.log(`🔄 Auto-refresh: ${CONFIG.REFRESH_INTERVAL}ms`);
}

// Start the app
init();