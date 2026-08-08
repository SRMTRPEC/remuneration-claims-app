import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, FileText, Users } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.role === 'admin') {
          setIsAuthenticated(true);
        } else {
          navigate('/admin-login');
        }
      })
      .catch(() => navigate('/admin-login'));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    navigate('/admin-login');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="font-secondary bg-neutral-background text-text-secondary overflow-x-hidden min-h-screen flex w-full relative">
      {/* Sidebar */}
      <aside className="w-[280px] bg-brand-primary h-screen sticky top-0 flex flex-col p-6 shadow-mega z-40">
        <div className="text-2xl font-bold text-white tracking-tight mb-12">
          Admin Portal<span className="text-brand-accent">.</span>
        </div>

        <nav className="flex flex-col gap-4 flex-grow">
          <Link to="/admin/dashboard" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors font-mono uppercase tracking-widest text-xs">
            <Home size={16} /> Dashboard
          </Link>
          <Link to="/admin/claims" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors font-mono uppercase tracking-widest text-xs">
            <FileText size={16} /> Claims
          </Link>
          <Link to="/admin/users" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors font-mono uppercase tracking-widest text-xs">
            <Users size={16} /> Users
          </Link>
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 text-white/50 hover:text-brand-accent transition-colors font-mono uppercase tracking-widest text-xs mt-auto">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8 bg-neutral-surface min-h-screen relative overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
