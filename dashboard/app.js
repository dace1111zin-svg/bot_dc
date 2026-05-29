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
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('dashboard-app').classList.add('hidden');
  stopStatsPolling();
}

function showDashboard() {
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
    // Populate form fields
    for (const [key, value] of Object.entries(res)) {
      const input = document.getElementById(`cfg-${key.toLowerCase().replace(/_/g, '-')}`);
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
