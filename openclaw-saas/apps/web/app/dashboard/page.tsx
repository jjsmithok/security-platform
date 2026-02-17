'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  subscriptionStatus?: string;
}

interface ApiKey {
  id: string;
  name: string;
  lastUsed?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    fetchUser(token);
    fetchKeys(token);
  }, []);

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUser(data);
    } catch (err) {
      setError('Failed to load user data');
      localStorage.removeItem('token');
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const fetchKeys = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/user/keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) return;
      const data = await res.json();
      setKeys(data);
    } catch (err) {
      console.error('Failed to fetch keys');
    }
  };

  const createKey = async () => {
    const token = localStorage.getItem('token');
    if (!token || !newKeyName.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/user/keys`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!res.ok) throw new Error('Failed to create key');
      
      const data = await res.json();
      alert(`API Key created: ${data.key}\n\nSave this key - you won't be able to see it again!`);
      setNewKeyName('');
      fetchKeys(token);
    } catch (err) {
      alert('Failed to create API key');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return (
    <main>
      <header>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>🛡️ OpenClaw</h1>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      <section className="container dashboard">
        <div className="dashboard-header">
          <div>
            <h2>Welcome{user?.name ? `, ${user.name}` : ''}</h2>
            <p style={{ color: '#666' }}>{user?.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              padding: '0.5rem 1rem', 
              background: user?.subscriptionStatus === 'active' ? '#dcfce7' : '#f3f4f6',
              color: user?.subscriptionStatus === 'active' ? '#16a34a' : '#666',
              borderRadius: '20px',
              fontWeight: '500'
            }}>
              {user?.subscriptionStatus === 'active' ? '✅ Pro Plan' : 'Free Tier'}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div className="stats">
          <div className="stat-card">
            <h4>API Keys</h4>
            <div className="value">{keys.length}</div>
          </div>
          <div className="stat-card">
            <h4>API Calls (30d)</h4>
            <div className="value">0</div>
          </div>
          <div className="stat-card">
            <h4>Threats Blocked</h4>
            <div className="value">0</div>
          </div>
          <div className="stat-card">
            <h4>Risk Score</h4>
            <div className="value" style={{ color: '#16a34a' }}>Low</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>API Keys</h3>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Key name (e.g., Production)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px' }}
            />
            <button onClick={createKey} className="btn btn-primary">
              Create Key
            </button>
          </div>

          {keys.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              No API keys yet. Create one to get started.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>{key.name}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Quick Test</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Test your protection with the protected endpoint:
          </p>
          <code style={{ 
            display: 'block', 
            padding: '1rem', 
            background: '#1a1a2e', 
            color: '#fff', 
            borderRadius: '6px',
            overflow: 'auto'
          }}>
            curl -X POST {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/protected/echo \<br/>
            -H "Authorization: Bearer YOUR_API_KEY" \<br/>
            -H "Content-Type: application/json" \<br/>
            -d '{"test": "data"}'
          </code>
        </div>
      </section>
    </main>
  );
}
