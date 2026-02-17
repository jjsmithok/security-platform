'use client';

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (isLogin) {
        localStorage.setItem('token', data.accessToken);
        window.location.href = '/dashboard';
      } else {
        setIsLogin(true);
        setError('Registration successful! Please log in.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <header>
        <div className="container">
          <h1>🛡️ OpenClaw</h1>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h2>AI-Powered Protection Service</h2>
          <p>Protect your APIs from prompt injection, abuse, and anomalous behavior</p>
          <a href="#auth" className="btn btn-primary">Get Started Free</a>
        </div>
      </section>

      <section className="container">
        <div className="features">
          <div className="feature-card">
            <h3>🛡️ Prompt Injection Detection</h3>
            <p>Advanced AI models detect and block prompt injection attacks in real-time</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Rate Limiting</h3>
            <p>Flexible rate limiting with Redis-backed distributed counters</p>
          </div>
          <div className="feature-card">
            <h3>📊 Risk Scoring</h3>
            <p>Multi-factor risk scoring engine with configurable thresholds</p>
          </div>
          <div className="feature-card">
            <h3>💳 Subscription Management</h3>
            <p>Stripe-powered billing with Basic ($19/mo) and Pro ($49/mo) plans</p>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '3rem 0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Simple Pricing</h2>
        <div className="pricing">
          <div className="pricing-card">
            <h3>Basic</h3>
            <div className="price">$19/mo</div>
            <p>Core protection features</p>
            <ul style={{ textAlign: 'left', margin: '1rem 0', paddingLeft: '1.5rem' }}>
              <li>Prompt injection detection</li>
              <li>Basic rate limiting</li>
              <li>1000 API calls/month</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%' }}>Choose Basic</button>
          </div>
          <div className="pricing-card featured">
            <h3>Pro</h3>
            <div className="price">$49/mo</div>
            <p>Advanced protection</p>
            <ul style={{ textAlign: 'left', margin: '1rem 0', paddingLeft: '1.5rem' }}>
              <li>Everything in Basic</li>
              <li>Advanced risk scoring</li>
              <li>Unlimited API calls</li>
              <li>Priority support</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%' }}>Choose Pro</button>
          </div>
        </div>
      </section>

      <section id="auth" className="container" style={{ padding: '3rem 0', maxWidth: '400px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          
          {error && (
            <div style={{ 
              padding: '0.75rem', 
              background: '#fee2e2', 
              color: '#dc2626', 
              borderRadius: '6px',
              marginBottom: '1rem' 
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p style={{ marginTop: '1rem', textAlign: 'center' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#4361ee', 
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>

      <footer style={{ background: '#1a1a2e', color: 'white', padding: '2rem 0', marginTop: '4rem' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p>© 2024 OpenClaw Protection Service. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
