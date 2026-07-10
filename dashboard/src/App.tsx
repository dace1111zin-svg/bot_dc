import { useState, useEffect, useRef } from 'react';
import PublicHeader from './components/PublicHeader';
import PublicHero from './components/PublicHero';
import LeaderboardBoard, { LeaderboardEntry } from './components/LeaderboardBoard';
import LeafletMap from './components/LeafletMap';
import PublicFooter from './components/PublicFooter';

import AdminOverview from './components/AdminOverview';
import AdminLeaderboards from './components/AdminLeaderboards';
import AdminSettings from './components/AdminSettings';
import AdminBroadcast from './components/AdminBroadcast';

export default function App() {
  // Authentication & Layout Mode States
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'members' | 'settings' | 'broadcast'>('overview');

  // Leaderboard Data States
  const [activeCat, setActiveCat] = useState<'time' | 'money' | 'iq'>('time');
  const [categories, setCategories] = useState<{
    time: { label: string; unit: string; color: string; entries: LeaderboardEntry[] };
    money: { label: string; unit: string; color: string; entries: LeaderboardEntry[] };
    iq: { label: string; unit: string; color: string; entries: LeaderboardEntry[] };
  }>({
    time: { label: "Top Time", unit: "h", color: '#ff7614', entries: [] },
    money: { label: "Top Money", unit: "$", color: '#fbbd08', entries: [] },
    iq: { label: "Top IQ", unit: "", color: '#ff5a00', entries: [] }
  });

  // Admin Data States
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminConfig, setAdminConfig] = useState<any>(null);
  const [broadcastChannels, setBroadcastChannels] = useState<any[]>([]);

  // Telemetry Polling Intervals
  const liveTimerRef = useRef<number | null>(null);

  // Modals Manager States
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LeaderboardEntry | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editUserError, setEditUserError] = useState('');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addValue, setAddValue] = useState<number>(0);
  const [addMemberError, setAddMemberError] = useState('');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<LeaderboardEntry | null>(null);

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [searchLocUserQuery, setSearchLocUserQuery] = useState('');
  const [searchLocResults, setSearchLocResults] = useState<any[]>([]);
  const [selectedLocUser, setSelectedLocUser] = useState<any>(null);
  const [locStatusMsg, setLocStatusMsg] = useState('');

  // Toast Notification States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Helper function for API Requests
  const apiRequest = async (path: string, method = 'GET', body: any = null) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(path, options);
      if (res.status === 401) {
        handleLogout();
        return null;
      }
      return await res.json();
    } catch (error) {
      console.error(`API Request error (${path}):`, error);
      showToast('Failed to connect to server');
      return null;
    }
  };

  // Fetch Public/General Leaderboard list data
  const fetchLeaderboardData = async () => {
    const res = await apiRequest('/api/public/leaderboards');
    if (!res) return;

    setCategories({
      time: {
        label: "Top Time",
        unit: "h",
        color: '#ff7614',
        entries: (res.voice || []).map((u: any) => ({
          user_id: u.user_id,
          name: u.display_name || u.username,
          username: u.username,
          value: u.total_seconds,
          is_active: u.is_active,
          active_since: u.active_since,
          avatar_url: u.avatar_url
        }))
      },
      money: {
        label: "Top Money",
        unit: "$",
        color: '#fbbd08',
        entries: (res.economy || []).map((u: any) => ({
          user_id: u.user_id,
          name: u.display_name || u.username,
          username: u.username,
          value: u.balance,
          avatar_url: u.avatar_url
        }))
      },
      iq: {
        label: "Top IQ",
        unit: "",
        color: '#ff5a00',
        entries: (res.quiz || []).map((u: any) => ({
          user_id: u.user_id,
          name: u.display_name || u.username,
          username: u.username,
          value: u.correct_answers,
          avatar_url: u.avatar_url
        }))
      }
    });
  };

  // Check user authentication
  const checkAuth = async () => {
    if (!adminToken) return;
    const res = await apiRequest('/api/verify');
    if (res && res.success) {
      // Validated
    } else {
      handleLogout();
    }
  };

  // Trigger login trigger check
  const tryLogin = async () => {
    setLoginError('');
    const res = await apiRequest('/api/login', 'POST', { password: loginPassword });
    if (res && res.success) {
      localStorage.setItem('admin_token', res.token);
      setAdminToken(res.token);
      setIsLoginOpen(false);
      setIsAdminMode(true);
      setAdminTab('overview');
      setLoginPassword('');
    } else {
      setLoginError('Incorrect password.');
    }
  };

  // Handle logging out
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    setIsAdminMode(false);
  };

  // Fetch admin overview stats
  const fetchAdminStats = async () => {
    const res = await apiRequest('/api/stats');
    if (res) {
      setAdminStats(res);
    }
  };

  // Fetch bot config settings
  const fetchAdminSettings = async () => {
    const res = await apiRequest('/api/config');
    if (res) {
      setAdminConfig(res);
    }
  };

  // Save bot config settings
  const saveSettings = async (values: Record<string, string>) => {
    let success = true;
    for (const key of Object.keys(values)) {
      const res = await apiRequest('/api/config', 'POST', { key, value: values[key] });
      if (!res || !res.success) success = false;
    }
    if (success) {
      showToast('Configurations saved successfully!');
      fetchAdminSettings();
      return true;
    } else {
      showToast('Failed to save configurations.');
      return false;
    }
  };

  // Fetch broadcast text channels list
  const fetchBroadcastChannels = async () => {
    const res = await apiRequest('/api/channels');
    if (res && res.channels) {
      setBroadcastChannels(res.channels);
    }
  };

  // Send server channel announcement broadcast
  const sendBroadcast = async (body: any) => {
    const res = await apiRequest('/api/broadcast', 'POST', body);
    if (res && res.success) {
      showToast('Broadcast sent successfully! 🚀');
      return true;
    } else {
      showToast('Failed to send broadcast.');
      return false;
    }
  };

  // Save updated user statistic edits
  const saveEditUser = async () => {
    if (!editingUser) return;
    setEditUserError('');
    
    const field = activeCat === 'time' ? 'total_seconds' : (activeCat === 'money' ? 'balance' : 'correct_answers');
    const sendValue = activeCat === 'time' ? editValue * 3600 : editValue;

    const res = await apiRequest('/api/users/update', 'POST', {
      user_id: editingUser.user_id,
      field,
      value: sendValue
    });

    if (res && res.success) {
      setIsEditUserOpen(false);
      showToast('Entry updated successfully');
      fetchLeaderboardData();
    } else {
      setEditUserError('Failed to update entry.');
    }
  };

  // Add a new member entry
  const saveAddMember = async () => {
    const userId = addUserId.trim();
    if (!userId) {
      setAddMemberError('Please enter a valid Discord User ID.');
      return;
    }
    setAddMemberError('');

    const field = activeCat === 'time' ? 'total_seconds' : (activeCat === 'money' ? 'balance' : 'correct_answers');
    const sendValue = activeCat === 'time' ? addValue * 3600 : addValue;

    const res = await apiRequest('/api/users/update', 'POST', {
      user_id: userId,
      field,
      value: sendValue
    });

    if (res && res.success) {
      setIsAddMemberOpen(false);
      showToast('Member added successfully');
      fetchLeaderboardData();
      setAddUserId('');
      setAddValue(0);
    } else {
      setAddMemberError('Failed to add member.');
    }
  };

  // Delete a user entry
  const saveDeleteUser = async () => {
    if (!pendingDeleteUser) return;

    const res = await apiRequest('/api/users/delete', 'POST', {
      user_id: pendingDeleteUser.user_id,
      category: activeCat
    });

    setIsDeleteConfirmOpen(false);
    if (res && res.success) {
      showToast('Entry deleted');
      fetchLeaderboardData();
    } else {
      showToast('Failed to delete entry');
    }
  };

  // Search Discord User Account for Location Pinner
  const searchLocUsers = async (query: string) => {
    setSearchLocUserQuery(query);
    if (!query.trim()) {
      setSearchLocResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.results) {
        setSearchLocResults(data.results);
      } else {
        setSearchLocResults([]);
      }
    } catch (err) {
      console.error("Search users error:", err);
    }
  };

  // Handle location pinner submission with browser navigator API
  const submitUserLocation = () => {
    if (!selectedLocUser) return;
    setLocStatusMsg('Requesting browser location permission...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocStatusMsg('Saving position to server...');

          try {
            const res = await fetch('/api/public/update_location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: selectedLocUser.user_id,
                latitude: lat,
                longitude: lng
              })
            });
            const data = await res.json();
            if (data && data.success) {
              setLocStatusMsg('Location saved and pinned! 🎉');
              setTimeout(() => {
                setIsLocationOpen(false);
                // Trigger map refresh if it's currently on Cambodia view
                // This state update triggers re-render of LeafletMap
                fetchLeaderboardData();
              }, 1200);
            } else {
              setLocStatusMsg('Failed to save location.');
            }
          } catch (err) {
            setLocStatusMsg('Error sending request to server.');
            console.error(err);
          }
        },
        (err) => {
          setLocStatusMsg('Permission denied or tracking error.');
          console.warn(err);
        }
      );
    } else {
      setLocStatusMsg('Geolocation is not supported by your browser.');
    }
  };

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 1800);
  };

  // Initialize data on mount
  useEffect(() => {
    fetchLeaderboardData();
    checkAuth();

    // Start Live incremental seconds voice timer for active talking users
    liveTimerRef.current = window.setInterval(() => {
      setCategories((prev) => {
        let hasActive = false;
        const timeEntries = prev.time.entries.map((entry) => {
          if (entry.is_active) {
            hasActive = true;
            return { ...entry, value: entry.value + 1 };
          }
          return entry;
        });

        if (hasActive) {
          return {
            ...prev,
            time: { ...prev.time, entries: timeEntries }
          };
        }
        return prev;
      });
    }, 1000);

    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Sync state loops depending on the active admin view tabs selection
  useEffect(() => {
    if (!isAdminMode) return;

    if (adminTab === 'overview') {
      fetchAdminStats();
    } else if (adminTab === 'members') {
      fetchLeaderboardData();
    } else if (adminTab === 'settings') {
      fetchAdminSettings();
    } else if (adminTab === 'broadcast') {
      fetchBroadcastChannels();
    }
  }, [isAdminMode, adminTab]);

  const initials = (name: string) => {
    return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??';
  };

  return (
    <>
      <div className="grid-veil"></div>

      {/* Decorative Fixed Floating Emojis */}
      <div className="floating-emojis">
        <div className="floating-emoji" style={{ left: '8%', animationDelay: '0s' }}>👾</div>
        <div className="floating-emoji" style={{ left: '23%', animationDelay: '4s' }}>✨</div>
        <div className="floating-emoji" style={{ left: '41%', animationDelay: '1.5s' }}>👾</div>
        <div className="floating-emoji" style={{ left: '56%', animationDelay: '6s' }}>✨</div>
        <div className="floating-emoji" style={{ left: '73%', animationDelay: '3s' }}>👾</div>
        <div className="floating-emoji" style={{ left: '88%', animationDelay: '8s' }}>✨</div>
        <div className="floating-emoji" style={{ left: '17%', animationDelay: '11s' }}>👾</div>
        <div className="floating-emoji" style={{ left: '65%', animationDelay: '9s' }}>🏆</div>
      </div>

      {/* Toast Alert */}
      <div className={`save-toast ${toastMessage ? 'show' : ''}`}>{toastMessage}</div>

      {!isAdminMode ? (
        /* ============ PUBLIC VIEW ============ */
        <div id="publicView">
          <PublicHeader
            adminToken={adminToken}
            onOpenLogin={() => {
              setIsLoginOpen(true);
              setLoginError('');
              setLoginPassword('');
            }}
            onLogout={handleLogout}
            isAdminMode={false}
            onToggleAdminView={(showAdmin) => setIsAdminMode(showAdmin)}
          />

          <PublicHero />

          <main>
            <LeaderboardBoard
              entries={categories[activeCat].entries}
              activeCat={activeCat}
              onTabChange={(cat) => setActiveCat(cat)}
            />

            <LeafletMap
              entries={categories[activeCat].entries}
              activeCat={activeCat}
              onOpenRegisterLocation={() => {
                setIsLocationOpen(true);
                setSearchLocUserQuery('');
                setSearchLocResults([]);
                setSelectedLocUser(null);
                setLocStatusMsg('');
              }}
            />
          </main>

          <PublicFooter onResetView={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        </div>
      ) : (
        /* ============ ADMIN VIEW ============ */
        <div id="adminView" style={{ display: 'block' }}>
          <div className="admin-bar">
            <div className="logo" onClick={() => setIsAdminMode(false)}>
              <div className="logo-mark" style={{ background: '#5865F2' }}>
                <svg viewBox="0 0 127.14 96.36" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.2,77.2,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.2,77.2,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.87-.64,1.71-1.32,2.51-2a75.46,75.46,0,0,0,73.08,0c.8,0.7,1.64,1.38,2.51,2a68.43,68.43,0,0,1-10.5,5A77.7,77.7,0,0,0,95.14,85.5a105.73,105.73,0,0,0,31-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                </svg>
              </div>
              REAL<span className="accent">TIME</span>{' '}
              <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '13px', marginLeft: '6px' }}>/ admin</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setIsAdminMode(false)}>
                View Public
              </button>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>

          <div className="admin-container">
            {/* Sidebar Admin Nav */}
            <aside className="admin-sidebar">
              <button
                className={`admin-nav-btn ${adminTab === 'overview' ? 'active' : ''}`}
                onClick={() => setAdminTab('overview')}
              >
                📊 Overview
              </button>
              <button
                className={`admin-nav-btn ${adminTab === 'members' ? 'active' : ''}`}
                onClick={() => setAdminTab('members')}
              >
                👥 Leaderboards
              </button>
              <button
                className={`admin-nav-btn ${adminTab === 'settings' ? 'active' : ''}`}
                onClick={() => setAdminTab('settings')}
              >
                ⚙️ Bot Settings
              </button>
              <button
                className={`admin-nav-btn ${adminTab === 'broadcast' ? 'active' : ''}`}
                onClick={() => setAdminTab('broadcast')}
              >
                📢 Broadcast Console
              </button>
            </aside>

            {/* Admin Content Panels */}
            <main className="admin-main">
              {adminTab === 'overview' && <AdminOverview stats={adminStats} />}

              {adminTab === 'members' && (
                <AdminLeaderboards
                  entries={categories[activeCat].entries}
                  activeCat={activeCat}
                  onTabChange={(cat) => setActiveCat(cat)}
                  onEditClick={(userId) => {
                    const target = categories[activeCat].entries.find((u) => u.user_id === userId);
                    if (target) {
                      setEditingUser(target);
                      setEditValue(activeCat === 'time' ? Math.round(target.value / 3600) : target.value);
                      setIsEditUserOpen(true);
                      setEditUserError('');
                    }
                  }}
                  onDeleteClick={(userId) => {
                    const target = categories[activeCat].entries.find((u) => u.user_id === userId);
                    if (target) {
                      setPendingDeleteUser(target);
                      setIsDeleteConfirmOpen(true);
                    }
                  }}
                  onAddClick={() => {
                    setIsAddMemberOpen(true);
                    setAddUserId('');
                    setAddValue(0);
                    setAddMemberError('');
                  }}
                />
              )}

              {adminTab === 'settings' && <AdminSettings config={adminConfig} onSave={saveSettings} />}

              {adminTab === 'broadcast' && (
                <AdminBroadcast channels={broadcastChannels} onSendBroadcast={sendBroadcast} />
              )}
            </main>
          </div>
        </div>
      )}

      {/* ============ MODAL: LOGIN ============ */}
      {isLoginOpen && (
        <div className="overlay show" onClick={(e) => e.target === e.currentTarget && setIsLoginOpen(false)}>
          <div className="modal">
            <button className="close" onClick={() => setIsLoginOpen(false)}>
              &times;
            </button>
            <h3 className="display">Admin sign in</h3>
            <p className="hint">Manage the leaderboards for this server.</p>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
              />
            </div>
            {loginError && <div className="err">{loginError}</div>}
            <button className="btn btn-primary" onClick={tryLogin}>
              Sign in
            </button>
            <div className="demo-hint">Demo Password — admin123</div>
          </div>
        </div>
      )}

      {/* ============ MODAL: EDIT USER ============ */}
      {isEditUserOpen && editingUser && (
        <div className="overlay show" onClick={(e) => e.target === e.currentTarget && setIsEditUserOpen(false)}>
          <div className="modal">
            <button className="close" onClick={() => setIsEditUserOpen(false)}>
              &times;
            </button>
            <h3 className="display">Edit Entry</h3>
            <p className="hint">Update rank values for this user.</p>

            <div
              className="modal-user-info"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                borderBottom: '2px solid rgba(0,0,0,0.06)',
                paddingBottom: '16px',
              }}
            >
              <div
                className="photo-sm"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--violet)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  border: '2px solid var(--line)',
                  fontSize: '16px',
                  flexShrink: 0,
                  padding: editingUser.avatar_url ? 0 : undefined,
                }}
              >
                {editingUser.avatar_url ? (
                  <img
                    src={editingUser.avatar_url}
                    alt={editingUser.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  initials(editingUser.name)
                )}
              </div>
              <div>
                <strong style={{ fontSize: '16px', display: 'block' }}>{editingUser.name}</strong>
                <span style={{ fontSize: '12px', color: 'var(--muted-2)' }}>@{editingUser.username || 'unknown'}</span>
              </div>
            </div>

            <div className="field">
              <label>
                {activeCat === 'time'
                  ? 'Voice Activity (Hours)'
                  : activeCat === 'money'
                    ? 'Kla Klouk Balance ($)'
                    : 'IQ Quiz Score (Correct Answers)'}
              </label>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--line)',
                  borderRadius: '10px',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '2px 2px 0px rgba(0,0,0,0.05)',
                }}
              />
              <div className="field-help">
                {activeCat === 'time'
                  ? 'Value is in hours. e.g. 595. Database tracks seconds.'
                  : activeCat === 'money'
                    ? 'Value is in currency. e.g. 150000'
                    : 'Number of correct answers.'}
              </div>
            </div>

            {editUserError && <div className="err">{editUserError}</div>}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsEditUserOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEditUser}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: ADD MEMBER ============ */}
      {isAddMemberOpen && (
        <div className="overlay show" onClick={(e) => e.target === e.currentTarget && setIsAddMemberOpen(false)}>
          <div className="modal">
            <button className="close" onClick={() => setIsAddMemberOpen(false)}>
              &times;
            </button>
            <h3 className="display">Add Member</h3>
            <p className="hint">Insert a new member into this leaderboard category.</p>

            <div className="field">
              <label>Discord User ID</label>
              <input
                type="text"
                placeholder="123456789012345678"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--line)',
                  borderRadius: '10px',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '2px 2px 0px rgba(0,0,0,0.05)',
                }}
              />
              <div className="field-help">Find user ID by enabling developer mode on Discord.</div>
            </div>

            <div className="field">
              <label>
                {activeCat === 'time'
                  ? 'Starting Voice Time (Hours)'
                  : activeCat === 'money'
                    ? 'Starting Balance ($)'
                    : 'Starting IQ Quiz Score'}
              </label>
              <input
                type="number"
                value={addValue}
                onChange={(e) => setAddValue(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--line)',
                  borderRadius: '10px',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: '2px 2px 0px rgba(0,0,0,0.05)',
                }}
              />
              <div className="field-help">
                {activeCat === 'time'
                  ? 'Value is in hours. e.g. 10'
                  : activeCat === 'money'
                    ? 'Starting Kla Klouk wallet money.'
                    : 'Initial correct answers.'}
              </div>
            </div>

            {addMemberError && <div className="err">{addMemberError}</div>}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsAddMemberOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveAddMember}>
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: DELETE CONFIRM ============ */}
      {isDeleteConfirmOpen && pendingDeleteUser && (
        <div className="overlay show" onClick={(e) => e.target === e.currentTarget && setIsDeleteConfirmOpen(false)}>
          <div className="modal" style={{ maxWidth: '360px' }}>
            <h3 className="display" style={{ fontSize: '20px' }}>
              Delete this entry?
            </h3>
            <p className="hint">
              Remove "{pendingDeleteUser.name}" from {activeCat === 'time' ? 'Voice Time' : activeCat === 'money' ? 'Money' : 'IQ Score'}? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsDeleteConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  background: '#ef4444',
                  color: '#fff',
                  border: '2px solid var(--line)',
                  boxShadow: '2px 2px 0px var(--line)',
                }}
                onClick={saveDeleteUser}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: REGISTER LOCATION ============ */}
      {isLocationOpen && (
        <div className="overlay show" onClick={(e) => e.target === e.currentTarget && setIsLocationOpen(false)}>
          <div className="modal" style={{ maxWidth: '420px', width: '90%', border: '3px solid var(--line)', boxShadow: '6px 6px 0px var(--line)' }}>
            <button className="close" onClick={() => setIsLocationOpen(false)}>
              &times;
            </button>
            <h3 className="display" style={{ fontSize: '22px' }}>
              📍 Pin Your Location
            </h3>
            <p className="hint">Search your Discord account to pin your coordinates to the Cambodia map.</p>

            <div>
              <div className="field">
                <label>Search Discord Username</label>
                <input
                  type="text"
                  value={searchLocUserQuery}
                  onChange={(e) => searchLocUsers(e.target.value)}
                  placeholder="Type username..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid var(--line)',
                    borderRadius: '10px',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    outline: 'none',
                    boxShadow: '2px 2px 0px rgba(0,0,0,0.05)',
                  }}
                />
              </div>

              {searchLocResults.length > 0 && (
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '2px solid var(--line)',
                    borderRadius: '8px',
                    background: '#ffffff',
                    marginBottom: '15px',
                    marginTop: '-10px',
                  }}
                >
                  {searchLocResults.map((user) => (
                    <div
                      key={user.user_id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                      onClick={() => {
                        setSelectedLocUser(user);
                        setSearchLocResults([]);
                        setSearchLocUserQuery('');
                      }}
                    >
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                        {user.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedLocUser && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: '#fffdeb',
                    border: '2px solid var(--line)',
                    borderRadius: '10px',
                    marginBottom: '15px',
                  }}
                >
                  <img
                    src={selectedLocUser.avatar_url}
                    alt={selectedLocUser.display_name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--line)' }}
                  />
                  <div>
                    <strong style={{ fontSize: '15px', color: 'var(--text)', display: 'block' }}>
                      {selectedLocUser.display_name}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted-2)' }}>Selected Account</span>
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={!selectedLocUser}
                onClick={submitUserLocation}
              >
                Pin My Location 📍
              </button>
            </div>
            {locStatusMsg && (
              <div
                style={{
                  marginTop: '15px',
                  fontWeight: 700,
                  color: 'var(--violet)',
                  fontSize: '13px',
                  textAlign: 'center',
                  minHeight: '18px',
                }}
              >
                {locStatusMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
