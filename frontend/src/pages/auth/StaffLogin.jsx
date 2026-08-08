import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function StaffLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [staffType, setStaffType] = useState('Internal');

  useEffect(() => {
    if (sessionStorage.getItem('logged_out') !== 'true') {
      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
          if (data.role === 'staff') navigate('/dashboard');
        })
        .catch(() => {});
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both ID and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ staff_id: username, password, staff_type: staffType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      sessionStorage.removeItem('logged_out');
      navigate('/dashboard');
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
        <h2 className="text-3xl font-primary font-bold text-brand-primary">Staff Portal</h2>
        <p className="text-xs font-mono uppercase tracking-widest text-text-secondary mt-2">Sign in to submit claims</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-brand-primary cursor-pointer">
              <input 
                type="radio" 
                name="staffType" 
                value="Internal" 
                checked={staffType === 'Internal'} 
                onChange={() => setStaffType('Internal')} 
                className="w-4 h-4 text-brand-accent focus:ring-brand-accent"
              /> Internal
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-primary cursor-pointer">
              <input 
                type="radio" 
                name="staffType" 
                value="External" 
                checked={staffType === 'External'} 
                onChange={() => setStaffType('External')} 
                className="w-4 h-4 text-brand-accent focus:ring-brand-accent"
              /> External
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
            {staffType === 'Internal' ? 'Staff ID' : 'Anna University Number'}
          </label>
          <div className="relative">
            {staffType === 'Internal' && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-mono font-bold">TRPT</span>
            )}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full bg-neutral-surface border border-black/5 rounded-md ${staffType === 'Internal' ? 'pl-14' : 'pl-4'} pr-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors font-mono`}
              placeholder={staffType === 'Internal' ? '1234' : 'Enter number'}
            />
          </div>
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
      
      <div className="mt-4 text-center">
        <p className="text-xs text-text-secondary font-secondary">
          Don't have an account? <Link to="/register" className="text-brand-accent hover:underline font-semibold">Register here</Link>
        </p>
      </div>
    </div>
  );
}
