import { useState, useEffect } from 'react';

interface Channel {
  channel_id: string;
  channel_name: string;
  guild_name: string;
}

interface AdminBroadcastProps {
  channels: Channel[];
  onSendBroadcast: (body: any) => Promise<boolean>;
}

export default function AdminBroadcast({ channels, onSendBroadcast }: AdminBroadcastProps) {
  const [channelId, setChannelId] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5865F2');
  const [thumbnail, setThumbnail] = useState('');
  const [footer, setFooter] = useState('');

  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (title || description || footer) {
      setPreviewVisible(true);
    } else {
      setPreviewVisible(false);
    }
  }, [title, description, footer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId) return;

    const body = {
      channel_id: channelId,
      message,
      embed: {
        title,
        description,
        color,
        thumbnail,
        footer,
      },
    };

    const success = await onSendBroadcast(body);
    if (success) {
      // Reset form
      setMessage('');
      setTitle('');
      setDescription('');
      setColor('#5865F2');
      setThumbnail('');
      setFooter('');
    }
  };

  return (
    <div className="admin-tab-content active">
      <h2>Broadcast Console</h2>
      <p className="hint">Publish messages or embeds directly into Discord server channels.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px' }} className="broadcast-layout-grid">
        {/* Form */}
        <form onSubmit={handleSubmit} className="neobrutal-form">
          <div className="field">
            <label>Target Channel</label>
            <select 
              value={channelId} 
              onChange={(e) => setChannelId(e.target.value)} 
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid var(--line)',
                borderRadius: '10px',
                background: '#ffffff',
                fontFamily: 'inherit',
                fontSize: '14.5px',
                color: 'var(--text)',
                outline: 'none',
                boxShadow: '2px 2px 0px rgba(0,0,0,0.05)'
              }}
            >
              <option value="" disabled>Select destination channel...</option>
              {channels.map((ch) => (
                <option key={ch.channel_id} value={ch.channel_id}>
                  #{ch.channel_name} ({ch.guild_name})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Text Message (Optional)</label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3} 
              placeholder="Message content outside of the embed..."
            ></textarea>
          </div>
          
          <div className="embed-builder" style={{ border: '2px solid var(--line)', borderRadius: '12px', padding: '18px', background: 'rgba(0,0,0,0.02)', marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontFamily: "'Space Grotesk', sans-serif" }}>Rich Embed builder</h4>
            <div className="field">
              <label>Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Embed title..."
              />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3} 
                placeholder="Embed description..."
              ></textarea>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Border Color</label>
                <input 
                  type="color" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ height: '42px', padding: '4px' }}
                />
              </div>
              <div className="field">
                <label>Thumbnail URL</label>
                <input 
                  type="text" 
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://domain.com/image.png"
                />
              </div>
            </div>
            <div className="field">
              <label>Footer Text</label>
              <input 
                type="text" 
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Footer text..."
              />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }}>
            Send Broadcast 🚀
          </button>
        </form>
        
        {/* Live Preview */}
        <div>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", margin: '0 0 12px', fontSize: '16px' }}>Live Discord Preview</h3>
          <div className="discord-msg-preview">
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="discord-preview-avatar"></div>
              <div style={{ flex: 1 }}>
                <div>
                  <strong style={{ fontSize: '14.5px', color: '#ffffff' }}>REALTIME Bot</strong>
                  <span className="bot-badge">BOT</span>
                  <span style={{ fontSize: '11.5px', color: '#72767d', marginLeft: '4px' }}>Today at 4:20 PM</span>
                </div>
                <div id="previewText" style={{ color: '#dcddde', fontSize: '14.5px', marginTop: '6px', minHeight: '18px' }}>
                  {message || 'Hello server!'}
                </div>
                {previewVisible && (
                  <div id="previewEmbedBox" className="preview-embed" style={{ display: 'flex' }}>
                    <div id="previewEmbedBorder" style={{ width: '4px', backgroundColor: color, borderRadius: '4px 0 0 4px' }}></div>
                    <div style={{ flex: 1, padding: '12px', background: '#2f3136', borderRadius: '0 4px 4px 0', position: 'relative' }}>
                      {thumbnail && (
                        <img 
                          src={thumbnail} 
                          alt="thumbnail" 
                          style={{ position: 'absolute', top: '12px', right: '12px', width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div id="previewEmbedTitle" style={{ fontWeight: 700, color: '#ffffff', fontSize: '15.5px', marginBottom: '6px' }}>
                        {title}
                      </div>
                      <div id="previewEmbedDesc" style={{ color: '#dcddde', fontSize: '13.5px', lineHeight: 1.4, marginRight: thumbnail ? '76px' : '0' }}>
                        {description}
                      </div>
                      {footer && (
                        <div id="previewEmbedFooter" style={{ color: '#72767d', fontSize: '11px', marginTop: '8px' }}>
                          {footer}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
