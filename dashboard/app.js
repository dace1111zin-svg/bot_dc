// ==================== STATE MANAGEMENT ====================
const state = {
  token: localStorage.getItem('admin_token') || '',
  currentTab: 'overview',
  statsInterval: null,
  users: [],
  channels: [],
  config: {}
};

// ==================== HELPER FUNCTIONS ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const iconSvg = type === 'success' 
    ? `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    : `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function apiRequest(path, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(path, options);
    if (res.status === 401) {
      // Session expired or unauthorized
      logout();
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`API Request error (${path}):`, error);
    showToast('Failed to connect to backend server', 'error');
    return null;
  }
}

// ==================== AUTHENTICATION & LOGIN ====================
async function checkAuth() {
  if (!state.token) {
    showLoginPage();
    return;
  }
  
  const res = await apiRequest('/api/verify');
  if (res && res.success) {
    showDashboard();
  } else {
    showLoginPage();
  }
}

function showLoginPage() {
  document.body.classList.remove('public-mode');
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('dashboard-app').classList.add('hidden');
  stopStatsPolling();
}

function showDashboard() {
  document.body.classList.remove('public-mode');
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('dashboard-app').classList.remove('hidden');
  
  // Set up views
  switchTab(state.currentTab);
  startStatsPolling();
  loadChannels();
  loadConfig();
}

function logout() {
  state.token = '';
  localStorage.removeItem('admin_token');
  showLoginPage();
  showToast('Logged out successfully', 'success');
}

// ==================== STATS POLLING ====================
function startStatsPolling() {
  updateStats();
  state.statsInterval = setInterval(updateStats, 5000);
}

function stopStatsPolling() {
  if (state.statsInterval) {
    clearInterval(state.statsInterval);
    state.statsInterval = null;
  }
}

async function updateStats() {
  const stats = await apiRequest('/api/stats');
  if (!stats) return;

  // Header stats
  document.getElementById('topbar-latency').textContent = `${stats.latency} ms`;
  document.getElementById('topbar-uptime').textContent = formatUptime(stats.uptime);

  // Overview stats cards
  document.getElementById('stat-latency').textContent = `${stats.latency} ms`;
  document.getElementById('stat-members').textContent = stats.total_members.toLocaleString();
  document.getElementById('stat-active-voice').textContent = stats.active_voice;
  document.getElementById('stat-currency').textContent = `$${stats.total_balance_circulation.toLocaleString()}`;

  // Cyberpunk gaming stats cards
  const gameMembers = document.getElementById('game-stat-members');
  if (gameMembers) gameMembers.textContent = stats.total_members.toLocaleString();
  
  const gameActive = document.getElementById('game-stat-active');
  if (gameActive) gameActive.textContent = stats.active_voice.toLocaleString();

  // Database indicators
  const dbBadge = document.getElementById('db-status');
  if (stats.db_connected) {
    dbBadge.textContent = 'Connected';
    dbBadge.className = 'badge badge-success';
  } else {
    dbBadge.textContent = 'Disconnected';
    dbBadge.className = 'badge badge-danger';
  }

  document.getElementById('db-voice-users').textContent = stats.voice_users_count;
  document.getElementById('db-economy-users').textContent = stats.economy_users_count;
  document.getElementById('db-total-uptime').textContent = `${Math.floor(stats.uptime / 3600)} h`;

  // Log system (can append server checks)
  const logsContainer = document.getElementById('console-logs');
  if (logsContainer.children.length > 20) {
    logsContainer.removeChild(logsContainer.firstElementChild);
  }
}

// ==================== TAB SWITCHING ====================
function switchTab(tabId) {
  state.currentTab = tabId;
  
  // Close mobile sidebar menu if open
  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl) {
    sidebarEl.classList.remove('active');
  }
  
  // Update Navigation active classes
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Switch display panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Action triggers based on active tab
  if (tabId === 'users') {
    loadUsers();
  } else if (tabId === 'leaderboards') {
    loadLeaderboards();
  }
}

// ==================== USERS & ECONOMY VIEW ====================
async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="loading-cell">
        <div class="spinner"></div>
        <span>Fetching records from database...</span>
      </td>
    </tr>
  `;

  const searchVal = document.getElementById('user-search').value;
  const res = await apiRequest(`/api/users?search=${encodeURIComponent(searchVal)}`);
  
  if (!res || !res.users) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color:var(--text-muted);">No records found or error connecting.</td></tr>`;
    return;
  }

  state.users = res.users;
  renderUsersTable(res.users);
}

function renderUsersTable(usersList) {
  const tbody = document.getElementById('users-table-body');
  if (usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color:var(--text-muted);">No matching users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  usersList.forEach(user => {
    const tr = document.createElement('tr');
    
    // User cell
    const userCell = document.createElement('td');
    userCell.className = 'user-cell';
    userCell.innerHTML = `
      <img class="user-avatar-small" src="${user.avatar_url}" alt="Avatar">
      <div>
        <span class="user-display-name">${escapeHtml(user.display_name)}</span>
        <span class="user-username">@${escapeHtml(user.username)}</span>
      </div>
    `;
    tr.appendChild(userCell);

    // ID cell
    const idCell = document.createElement('td');
    idCell.className = 'id-cell';
    idCell.textContent = user.user_id;
    tr.appendChild(idCell);

    // Voice time cell
    const voiceCell = document.createElement('td');
    voiceCell.textContent = formatDuration(user.total_seconds);
    tr.appendChild(voiceCell);

    // Balance cell
    const balanceCell = document.createElement('td');
    balanceCell.innerHTML = `<strong style="color: var(--color-amber);">$${user.balance.toLocaleString()}</strong>`;
    tr.appendChild(balanceCell);

    // Action cell
    const actionCell = document.createElement('td');
    actionCell.className = 'actions-cell';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.style.padding = '6px 12px';
    editBtn.style.fontSize = '12px';
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit`;
    editBtn.addEventListener('click', () => openEditModal(user));
    
    actionCell.appendChild(editBtn);
    tr.appendChild(actionCell);

    tbody.appendChild(tr);
  });
}

function openEditModal(user) {
  document.getElementById('edit-user-id').value = user.user_id;
  document.getElementById('edit-user-name').textContent = user.display_name;
  document.getElementById('edit-user-id-display').textContent = `ID: ${user.user_id}`;
  document.getElementById('edit-user-avatar').src = user.avatar_url;
  
  const voiceInput = document.getElementById('edit-user-voice');
  const balanceInput = document.getElementById('edit-user-balance');
  
  voiceInput.value = user.total_seconds;
  balanceInput.value = user.balance;
  
  updateVoiceFormatText(user.total_seconds);
  
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

function updateVoiceFormatText(seconds) {
  document.getElementById('edit-voice-formatted').textContent = `Formatted: ${formatDuration(seconds)}`;
}

// ==================== CONFIG / SETTINGS VIEW ====================
async function loadConfig() {
  const res = await apiRequest('/api/config');
  if (res) {
    state.config = res;
    // Map of configuration keys to HTML input element IDs
    const idMap = {
      'STAY_VOICE_CHANNEL_ID': 'cfg-stay-voice',
      'WELCOME_CHANNEL_ID': 'cfg-welcome',
      'LEADERBOARD_CHANNEL_ID': 'cfg-leaderboard',
      'CREATE_CHANNEL_ID': 'cfg-create-channel',
      'PARENT_CATEGORY_ID': 'cfg-parent-category',
      'AUTO_ROLE_ID': 'cfg-auto-role'
    };
    for (const [key, value] of Object.entries(res)) {
      const inputId = idMap[key];
      const input = inputId ? document.getElementById(inputId) : null;
      if (input) {
        input.value = value;
      }
    }
  }
}

// ==================== BROADCAST / LIVE PREVIEW ====================
async function loadChannels() {
  const res = await apiRequest('/api/channels');
  if (res && res.channels) {
    state.channels = res.channels;
    const select = document.getElementById('broadcast-channel');
    select.innerHTML = '<option value="" disabled selected>Select destination channel...</option>';
    
    // Group channels by Server/Guild name
    const grouped = {};
    res.channels.forEach(ch => {
      if (!grouped[ch.guild_name]) grouped[ch.guild_name] = [];
      grouped[ch.guild_name].push(ch);
    });

    for (const [guild, list] of Object.entries(grouped)) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = guild;
      list.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.channel_id;
        opt.textContent = `#${ch.channel_name}`;
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
    }
  }
}

function updateEmbedPreview() {
  const rawText = document.getElementById('broadcast-text').value;
  const embedTitle = document.getElementById('embed-title').value;
  const embedDesc = document.getElementById('embed-description').value;
  const embedColor = document.getElementById('embed-color').value;
  const embedThumbnail = document.getElementById('embed-thumbnail').value;
  const embedFooter = document.getElementById('embed-footer').value;

  const previewRaw = document.getElementById('preview-raw-text');
  const previewEmbed = document.getElementById('preview-embed');
  const previewBorder = document.getElementById('preview-border');
  const previewTitle = document.getElementById('preview-title');
  const previewDesc = document.getElementById('preview-desc');
  const previewFooter = document.getElementById('preview-footer-text');
  const previewThumb = document.getElementById('preview-thumb-img');

  // Text outside embed
  if (rawText.trim()) {
    previewRaw.textContent = rawText;
    previewRaw.style.display = 'block';
  } else {
    previewRaw.style.display = 'none';
  }

  // Embed container visibility (show only if title or desc exist)
  if (embedTitle.trim() || embedDesc.trim() || embedFooter.trim()) {
    previewEmbed.style.display = 'flex';
    
    // Set border color
    previewBorder.style.backgroundColor = embedColor;
    
    // Title
    if (embedTitle.trim()) {
      previewTitle.textContent = embedTitle;
      previewTitle.style.display = 'block';
    } else {
      previewTitle.style.display = 'none';
    }

    // Description
    if (embedDesc.trim()) {
      previewDesc.textContent = embedDesc;
      previewDesc.style.display = 'block';
    } else {
      previewDesc.style.display = 'none';
    }

    // Thumbnail
    if (embedThumbnail.trim() && isValidUrl(embedThumbnail)) {
      previewThumb.src = embedThumbnail;
      previewThumb.style.display = 'block';
    } else {
      previewThumb.style.display = 'none';
    }

    // Footer
    if (embedFooter.trim()) {
      previewFooter.textContent = embedFooter;
      previewFooter.style.display = 'block';
    } else {
      previewFooter.style.display = 'none';
    }
  } else {
    previewEmbed.style.display = 'none';
  }
}

// ==================== DOM EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Initialize gaming page graphics and feeds
  initCharts();
  startSimulatedFeed();

  // Password toggle
  document.getElementById('toggle-password').addEventListener('click', function() {
    const input = document.getElementById('password');
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    this.classList.toggle('active');
  });

  // Login form submit
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    const res = await apiRequest('/api/login', 'POST', { password });
    if (res && res.success) {
      state.token = res.token;
      localStorage.setItem('admin_token', res.token);
      showDashboard();
      showToast('Successfully authenticated!', 'success');
      document.getElementById('password').value = '';
    } else {
      showToast('Authentication failed. Invalid password.', 'error');
    }
  });

  // View Public Leaderboards click
  document.getElementById('btn-view-public').addEventListener('click', () => {
    document.body.classList.add('public-mode');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('dashboard-app').classList.remove('hidden');
    switchTab('leaderboards');
  });

  // Topbar Admin Login click (Visible in Public Mode)
  const topbarLoginBtn = document.getElementById('btn-goto-login-topbar');
  if (topbarLoginBtn) {
    topbarLoginBtn.addEventListener('click', () => {
      showLoginPage();
    });
  }

  // Sidebar Goto Login click (Visible in Public Mode)
  const gotoLoginLink = document.getElementById('nav-goto-login');
  if (gotoLoginLink) {
    gotoLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginPage();
    });
  }

  // Leaderboard Pill Tabs navigation
  document.querySelectorAll('.leaderboard-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      document.querySelectorAll('.leaderboard-pill').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      const type = this.getAttribute('data-type');
      state.activeLeaderboardType = type;
      renderActiveLeaderboard(type);
    });
  });

  // Mobile menu toggle click
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });
    // Click outside sidebar on mobile should close it
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== menuToggle) {
        sidebar.classList.remove('active');
      }
    });
  }

  // Navigation click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Logout click
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Search input change
  let searchTimeout = null;
  document.getElementById('user-search').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadUsers, 300);
  });

  // Refresh users button
  document.getElementById('btn-refresh-users').addEventListener('click', loadUsers);

  // Edit User Modal hooks
  document.getElementById('edit-user-voice').addEventListener('input', function() {
    updateVoiceFormatText(parseInt(this.value) || 0);
  });
  
  document.getElementById('btn-modal-close').addEventListener('click', closeEditModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeEditModal);
  
  // Submit User Edits
  document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('edit-user-id').value;
    const voiceVal = parseInt(document.getElementById('edit-user-voice').value);
    const balanceVal = parseInt(document.getElementById('edit-user-balance').value);
    
    const origUser = state.users.find(u => u.user_id === userId);
    if (!origUser) return;

    let success = true;

    // Update voice time if changed
    if (origUser.total_seconds !== voiceVal) {
      const res = await apiRequest('/api/users/update', 'POST', {
        user_id: userId,
        field: 'total_seconds',
        value: voiceVal
      });
      if (!res || !res.success) success = false;
    }

    // Update balance if changed
    if (origUser.balance !== balanceVal) {
      const res = await apiRequest('/api/users/update', 'POST', {
        user_id: userId,
        field: 'balance',
        value: balanceVal
      });
      if (!res || !res.success) success = false;
    }

    if (success) {
      showToast('User data saved successfully!', 'success');
      closeEditModal();
      loadUsers();
    } else {
      showToast('Error updating database attributes', 'error');
    }
  });

  // Settings Save handler
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    let success = true;

    for (const [key, value] of formData.entries()) {
      if (state.config[key] !== value) {
        const res = await apiRequest('/api/config', 'POST', { key, value });
        if (!res || !res.success) {
          success = false;
        } else {
          state.config[key] = value;
        }
      }
    }

    if (success) {
      showToast('System configuration saved!', 'success');
      loadConfig();
    } else {
      showToast('Failed to save some configurations', 'error');
    }
  });

  // Live Embed preview listeners
  const previewFields = [
    'broadcast-text', 'embed-title', 'embed-description', 
    'embed-color', 'embed-color-text', 'embed-thumbnail', 'embed-footer'
  ];
  previewFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateEmbedPreview);
    }
  });

  // Sync color text inputs
  const colorPicker = document.getElementById('embed-color');
  const colorText = document.getElementById('embed-color-text');
  
  if (colorPicker && colorText) {
    colorPicker.addEventListener('input', (e) => {
      colorText.value = e.target.value.toUpperCase();
      updateEmbedPreview();
    });
    colorText.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        colorPicker.value = e.target.value;
        updateEmbedPreview();
      }
    });
  }

  // Broadcast send handler
  document.getElementById('broadcast-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const channelId = document.getElementById('broadcast-channel').value;
    const textVal = document.getElementById('broadcast-text').value;
    const titleVal = document.getElementById('embed-title').value;
    const descVal = document.getElementById('embed-description').value;
    const colorVal = document.getElementById('embed-color').value;
    const thumbVal = document.getElementById('embed-thumbnail').value;
    const footerVal = document.getElementById('embed-footer').value;

    if (!channelId) {
      showToast('Please select a destination text channel', 'error');
      return;
    }

    const payload = {
      channel_id: channelId,
      message: textVal,
      embed: null
    };

    if (titleVal || descVal || footerVal) {
      payload.embed = {
        title: titleVal,
        description: descVal,
        color: colorVal,
        thumbnail_url: thumbVal,
        footer_text: footerVal
      };
    }

    const res = await apiRequest('/api/broadcast', 'POST', payload);
    if (res && res.success) {
      showToast('Announcement sent successfully!', 'success');
      // Reset embed inputs
      document.getElementById('broadcast-text').value = '';
      document.getElementById('embed-title').value = '';
      document.getElementById('embed-description').value = '';
      document.getElementById('embed-thumbnail').value = '';
      document.getElementById('embed-footer').value = '';
      updateEmbedPreview();
    } else {
      showToast('Failed to dispatch broadcast', 'error');
    }
  });
});

// ==================== STRING & VALIDATION UTIL ====================
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;  
  }
}

// ==================== LEADERBOARDS ACTIONS ====================
function formatVoiceTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

async function loadLeaderboards() {
  const listPane = document.getElementById('leaderboard-list-pane');
  const champPane = document.getElementById('leaderboard-champion-pane');

  // Show loading spinner
  const spinnerHtml = '<div class="leaderboard-loading"><div class="spinner"></div></div>';
  listPane.innerHTML = spinnerHtml;
  champPane.innerHTML = spinnerHtml;

  try {
    const res = await apiRequest('/api/public/leaderboards', 'GET');
    if (!res) {
      const errorHtml = '<div style="padding: 20px; text-align: center; color: var(--text-muted)">Failed to load data</div>';
      listPane.innerHTML = errorHtml;
      champPane.innerHTML = errorHtml;
      return;
    }

    // Cache the data
    state.leaderboardData = res;
    
    // Bind dynamic values for Cyberpunk stats cards
    if (res.voice && res.voice.length > 0) {
      // 1. Top Champion Name
      const topChampEl = document.getElementById('game-stat-champ');
      if (topChampEl) topChampEl.textContent = `@${res.voice[0].username}`;

      // 2. Sum of all voice hours
      const totalSec = res.voice.reduce((sum, u) => sum + (u.total_seconds || 0), 0);
      const totalHrs = Math.round(totalSec / 3600);
      const gameHoursEl = document.getElementById('game-stat-hours');
      if (gameHoursEl) gameHoursEl.textContent = `${totalHrs.toLocaleString()}h`;
    }
    
    // Render current active tab (default to voice)
    if (!state.activeLeaderboardType) {
      state.activeLeaderboardType = 'voice';
    }
    renderActiveLeaderboard(state.activeLeaderboardType);

  } catch (err) {
    console.error('Error loading leaderboards:', err);
    const errorHtml = '<div style="padding: 20px; text-align: center; color: var(--text-muted)">Connection Error</div>';
    listPane.innerHTML = errorHtml;
    champPane.innerHTML = errorHtml;
  }
}

function renderActiveLeaderboard(type) {
  const listPane = document.getElementById('leaderboard-list-pane');
  const champPane = document.getElementById('leaderboard-champion-pane');
  
  if (!state.leaderboardData) return;
  
  const data = state.leaderboardData[type] || [];
  
  const colorMap = {
    voice: { label: '⏰ Total Time', class: 'voice', icon: '🎙️' },
    economy: { label: '💰 Bank Balance', class: 'economy', icon: '🪙' },
    quiz: { label: '🧠 IQ Score', class: 'quiz', icon: '💡' }
  };
  
  const currentConfig = colorMap[type] || colorMap.voice;

  if (data.length === 0) {
    listPane.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted)">No rankings yet</div>';
    champPane.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted)">No champion yet</div>';
    return;
  }

  // 1. Render Top 1 Showcase (Right column)
  const champion = data[0];
  const formattedScore = type === 'voice' 
    ? formatVoiceTime(champion.total_seconds) 
    : (type === 'economy' ? `$${champion.balance.toLocaleString()}` : `${champion.correct_answers} pts`);
    
  const firstJoinMeta = type === 'voice' 
    ? `<div class="champ-meta-row"><span>Joined:</span> <strong>${escapeHtml(champion.first_join)}</strong></div>`
    : '';

  champPane.innerHTML = `
    <div class="champion-showcase-card ${currentConfig.class}">
      <div class="champ-banner-overlay"></div>
      <div class="champion-glow-ring"></div>
      <div class="crown-badge">👑 TOP 1 CHAMPION</div>
      
      <div class="champ-avatar-container">
        <img class="champ-large-avatar" src="${escapeHtml(champion.avatar_url)}" alt="avatar">
        <div class="champ-rank-number">1</div>
      </div>
      
      <h2 class="champ-display-name">${escapeHtml(champion.display_name)}</h2>
      <p class="champ-username">@${escapeHtml(champion.username)}</p>
      
      <div class="champ-score-badge">
        <span class="champ-score-icon">${currentConfig.icon}</span>
        <span class="champ-score-value">${formattedScore}</span>
      </div>
      
      <div class="champ-stats-footer">
        <div class="champ-meta-row">
          <span>Metric:</span>
          <strong>${currentConfig.label}</strong>
        </div>
        ${firstJoinMeta}
      </div>
    </div>
  `;

  // 2. Render Ranks 2 to 10 List (Left column)
  const contenders = data.slice(1, 10);
  if (contenders.length === 0) {
    listPane.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted)">No other contenders yet</div>';
    return;
  }

  const maxVal = type === 'voice' 
    ? (champion.total_seconds || 1) 
    : (type === 'economy' ? (champion.balance || 1) : (champion.correct_answers || 1));

  listPane.innerHTML = `
    <div class="contenders-container">
      ${contenders.map((item, index) => {
        const rank = index + 2;
        const scoreVal = type === 'voice' 
          ? item.total_seconds 
          : (type === 'economy' ? item.balance : item.correct_answers);
        const scoreStr = type === 'voice' 
          ? formatVoiceTime(item.total_seconds) 
          : (type === 'economy' ? `$${item.balance.toLocaleString()}` : `${item.correct_answers} pts`);
          
        const percentage = Math.round((scoreVal / maxVal) * 100);
        
        return `
          <div class="contender-row">
            <div class="contender-rank rank-${rank}">${rank}</div>
            <img class="contender-row-avatar" src="${escapeHtml(item.avatar_url)}" alt="avatar">
            
            <div class="contender-row-info">
              <div class="contender-row-meta">
                <span class="contender-row-name">${escapeHtml(item.display_name)}</span>
                <span class="contender-row-score">${scoreStr}</span>
              </div>
              <div class="row-progress-track">
                <div class="row-progress-fill ${currentConfig.class}" style="width: ${percentage}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ==================== INTERACTIVE CHARTS & SIMULATED FEED ====================
let voiceActivityChart = null;

function initCharts() {
  const ctx = document.getElementById('voice-activity-chart');
  if (!ctx) return;

  if (voiceActivityChart) {
    voiceActivityChart.destroy();
  }

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const voiceData = [120, 150, 190, 220, 260, 310, 390]; 
  
  voiceActivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Voice Hours',
        data: voiceData,
        borderColor: '#B7FF00', 
        borderWidth: 3,
        backgroundColor: 'rgba(183, 255, 0, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8B5CF6', 
        pointBorderColor: '#B7FF00',
        pointHoverRadius: 8,
        pointRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af',
            font: {
              family: 'Outfit'
            }
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af',
            font: {
              family: 'Outfit'
            }
          }
        }
      }
    }
  });
}

const simulatedNames = ['Kaishi', 'Ai', 'nh boy loy', 'Jockie Music', 'sg0874', 'mw_jinz_21893', 'niki060406', 'kezyy67'];
const simulatedRooms = ['General Voice', 'Gaming Lounge', 'Music Room', 'Chill Zone', 'Private Chat'];
const simulatedAvatars = [
  'https://cdn.discordapp.com/embed/avatars/0.png',
  'https://cdn.discordapp.com/embed/avatars/1.png',
  'https://cdn.discordapp.com/embed/avatars/2.png',
  'https://cdn.discordapp.com/embed/avatars/3.png',
  'https://cdn.discordapp.com/embed/avatars/4.png'
];

function addSimulatedActivity() {
  const feed = document.getElementById('simulated-activities-feed');
  if (!feed) return;

  const name = simulatedNames[Math.floor(Math.random() * simulatedNames.length)];
  const room = simulatedRooms[Math.floor(Math.random() * simulatedRooms.length)];
  const avatar = simulatedAvatars[Math.floor(Math.random() * simulatedAvatars.length)];
  const xp = Math.floor(Math.random() * 20) + 5;
  
  const actions = [
    `joined voice room <strong style="color: var(--neon-green)">${room}</strong>`,
    `earned <strong style="color: var(--neon-purple)">+${xp} XP</strong> in voice call`,
    `switched to channel <strong style="color: var(--neon-cyan)">${room}</strong>`,
    `unlocked a new badge activity milestone`
  ];
  
  const action = actions[Math.floor(Math.random() * actions.length)];
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const logHtml = `
    <div class="feed-item fade-in">
      <img class="feed-item-avatar" src="${avatar}" alt="avatar">
      <div class="feed-item-content">
        <span class="feed-user">${name}</span> ${action}
      </div>
      <span class="feed-time">${time}</span>
    </div>
  `;

  feed.insertAdjacentHTML('afterbegin', logHtml);

  if (feed.children.length > 8) {
    feed.removeChild(feed.lastElementChild);
  }
}

function startSimulatedFeed() {
  for (let i = 0; i < 5; i++) {
    addSimulatedActivity();
  }
  setInterval(addSimulatedActivity, 5000);
}
