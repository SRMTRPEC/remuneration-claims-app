import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-red-500 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-brand-primary">Invalid Link</h2>
        <p className="text-text-secondary">This password reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="text-brand-accent hover:underline font-medium">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <div className="text-center mb-2">
        <h2 className="text-3xl font-primary font-bold text-brand-primary">New Password</h2>
        <p className="text-xs font-mono uppercase tracking-widest text-text-secondary mt-2">Create a new secure password</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center border border-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm text-center border border-green-200">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            required
            minLength={6}
          />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !!message}
          className="mt-4 w-full bg-brand-accent text-white rounded-full py-3.5 text-xs font-mono font-bold tracking-[0.2em] uppercase hover:bg-brand-primary transition-all shadow-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
