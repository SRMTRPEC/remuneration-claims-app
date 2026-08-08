import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    if (sessionStorage.getItem('logged_out') !== 'true') {
      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
          if (data.role === 'admin') navigate('/admin/dashboard');
        })
        .catch(() => {});
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      sessionStorage.removeItem('logged_out');
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <Link to="/" className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary hover:text-brand-accent transition-colors self-start">
        ← Back to Home
      </Link>
      
      <div className="text-center mb-4">
        <h2 className="text-3xl font-primary font-bold text-brand-primary">System Admin</h2>
        <p className="text-xs font-mono uppercase tracking-widest text-text-secondary mt-2">Secure access only</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            placeholder="Enter your username"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-brand-accent text-white rounded-full py-3.5 text-xs font-mono font-bold tracking-[0.2em] uppercase hover:bg-brand-primary transition-all shadow-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
