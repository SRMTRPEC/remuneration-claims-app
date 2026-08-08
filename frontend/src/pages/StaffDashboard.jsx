import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut, FileText, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const userRes = await fetch('/api/auth/me');
        const userData = await userRes.json();
        
        if (userData.role !== 'staff') {
          navigate('/login');
          return;
        }
        
        setUser(userData.user);

        const claimsRes = await fetch('/api/claims/my');
        if (claimsRes.ok) {
          const claimsData = await claimsRes.json();
          setClaims(claimsData.claims || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login');
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-bg">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg">
      {/* Navbar */}
      <nav className="bg-white/70 backdrop-blur-md border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <span className="font-primary font-bold text-brand-primary tracking-tight">APRIL MAY Remuneration</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-brand-primary">{user?.staff_name}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-text-secondary hover:text-brand-accent transition-colors font-mono uppercase tracking-widest font-bold">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile & Actions */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* Profile Card */}
            <div className="bg-white rounded-md shadow-mega border border-black/5 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-bl-full -z-10"></div>
              
              <div className="w-16 h-16 bg-brand-primary/5 text-brand-primary rounded-full flex items-center justify-center mb-6">
                <User size={32} />
              </div>
              
              <h2 className="font-primary text-2xl font-bold text-brand-primary mb-1">{user?.staff_name}</h2>
              <p className="text-sm text-text-secondary font-mono mb-6">{user?.staff_type} Staff</p>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Staff ID</span>
                  <p className="font-semibold text-brand-primary">{user?.staff_id}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Department</span>
                  <p className="font-semibold text-brand-primary">{user?.department}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Designation</span>
                  <p className="font-semibold text-brand-primary">{user?.designation || '-'}</p>
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div className="bg-brand-primary rounded-md shadow-mega p-8 text-white">
              <h3 className="font-primary text-xl font-bold mb-2">Ready to claim?</h3>
              <p className="text-white/70 text-sm mb-6">Fill out the digital remuneration form to claim for duties performed.</p>
              <Link to="/claim" className="w-full bg-brand-accent hover:bg-white text-white hover:text-brand-primary px-6 py-4 rounded-full font-mono text-sm uppercase tracking-widest font-bold shadow-accent transition-all flex items-center justify-center gap-2">
                <PlusCircle size={18} /> Fill Claim Form
              </Link>
            </div>
          </div>

          {/* Right Column: Claim History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-md shadow-mega border border-black/5 p-8 h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-primary text-xl font-bold text-brand-primary flex items-center gap-2">
                  <FileText className="text-brand-accent" size={20} /> My Submitted Claims
                </h2>
                <span className="bg-brand-accent/10 text-brand-accent px-3 py-1 rounded-full text-xs font-bold font-mono">
                  {claims.length} Total
                </span>
              </div>

              {claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-black/5 rounded-md">
                  <FileText className="text-black/10 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-brand-primary mb-2">No claims found</h3>
                  <p className="text-text-secondary text-sm max-w-sm">You haven't submitted any remuneration claims yet. Click the button on the left to get started.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {claims.map(claim => (
                    <div key={claim.id} className="border border-black/5 rounded-md p-6 hover:border-brand-accent/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-lg font-bold text-brand-primary">{claim.claim_number}</span>
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle2 size={12} /> Submitted
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary font-mono">
                          Submitted on {new Date(claim.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Grand Total</span>
                        <span className="font-primary text-2xl font-bold text-brand-accent">{formatCurrency(claim.grand_total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
