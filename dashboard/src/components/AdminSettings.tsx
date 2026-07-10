import { useState, useEffect } from 'react';

interface AdminSettingsProps {
  config: Record<string, string | number> | null;
  onSave: (values: Record<string, string>) => Promise<boolean>;
}

export default function AdminSettings({ config, onSave }: AdminSettingsProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({
    STAY_VOICE_CHANNEL_ID: '',
    WELCOME_CHANNEL_ID: '',
    LEADERBOARD_CHANNEL_ID: '',
    CREATE_CHANNEL_ID: '',
    PARENT_CATEGORY_ID: '',
    AUTO_ROLE_ID: '',
  });

  useEffect(() => {
    if (config) {
      const updatedValues: Record<string, string> = {};
      Object.keys(formValues).forEach((key) => {
        updatedValues[key] = (config[key] !== undefined ? String(config[key]) : '');
      });
      setFormValues(updatedValues);
    }
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formValues);
  };

  if (!config) {
    return (
      <div className="admin-tab-content active">
        <h2>Bot Settings</h2>
        <p className="hint">Loading config options...</p>
      </div>
    );
  }

  return (
    <div className="admin-tab-content active">
      <h2>Bot Settings</h2>
      <p className="hint">Configure bot text channels and operational role variables.</p>
      <form onSubmit={handleSubmit} className="neobrutal-form">
        <div className="form-row">
          <div className="field">
            <label>Stay Voice Channel ID</label>
            <input
              type="text"
              name="STAY_VOICE_CHANNEL_ID"
              placeholder="000000000000000000"
              value={formValues.STAY_VOICE_CHANNEL_ID}
              onChange={handleChange}
              required
            />
            <div className="field-help">Voice channel where the bot stays 24/7.</div>
          </div>
          <div className="field">
            <label>Welcome Message Channel ID</label>
            <input
              type="text"
              name="WELCOME_CHANNEL_ID"
              placeholder="000000000000000000"
              value={formValues.WELCOME_CHANNEL_ID}
              onChange={handleChange}
              required
            />
            <div className="field-help">Channel for member greeting messages.</div>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Voice Leaderboard Channel ID</label>
            <input
              type="text"
              name="LEADERBOARD_CHANNEL_ID"
              placeholder="000000000000000000"
              value={formValues.LEADERBOARD_CHANNEL_ID}
              onChange={handleChange}
              required
            />
            <div className="field-help">Channel where bot posts top lists.</div>
          </div>
          <div className="field">
            <label>Create Room Channel ID</label>
            <input
              type="text"
              name="CREATE_CHANNEL_ID"
              placeholder="000000000000000000"
              value={formValues.CREATE_CHANNEL_ID}
              onChange={handleChange}
              required
            />
            <div className="field-help">Voice channel that triggers private room creation.</div>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Parent Category ID</label>
            <input
              type="text"
              name="PARENT_CATEGORY_ID"
              placeholder="000000000000000000"
              value={formValues.PARENT_CATEGORY_ID}
              onChange={handleChange}
              required
            />
            <div className="field-help">Category for temporary voice rooms.</div>
          </div>
          <div className="field">
            <label>Default Auto Role ID</label>
            <input
              type="text"
              name="AUTO_ROLE_ID"
              placeholder="000000000000000000"
              value={formValues.AUTO_ROLE_ID}
              onChange={handleChange}
              required
            />
            <div className="field-help">Role automatically assigned to new users.</div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
          Save Configurations
        </button>
      </form>
    </div>
  );
}
