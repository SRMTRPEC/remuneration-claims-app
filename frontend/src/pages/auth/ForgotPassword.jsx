import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message || 'If this email is registered, a reset link has been sent.');
        setEmail('');
      } else {
        setError(data.error || 'Failed to request reset link.');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <Link to="/login" className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary hover:text-brand-accent transition-colors self-start">
        ← Back to Login
      </Link>
      
      <div className="text-center mb-2">
        <h2 className="text-3xl font-primary font-bold text-brand-primary">Reset Password</h2>
        <p className="text-xs font-mono uppercase tracking-widest text-text-secondary mt-2">Enter your email address</p>
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
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            required
            placeholder="e.g. professor@srmtrpec.edu.in"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-brand-accent text-white rounded-full py-3.5 text-xs font-mono font-bold tracking-[0.2em] uppercase hover:bg-brand-primary transition-all shadow-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}
