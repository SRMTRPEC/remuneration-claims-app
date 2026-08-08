import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText, Activity, Users } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const statsRes = await fetch('/api/claims/stats');
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        const logsRes = await fetch('/api/admin/audit-log?limit=10');
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
        }
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-brand-accent font-mono uppercase tracking-widest text-xs animate-pulse">Initializing Ecosystem...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-brand-accent mb-2 block font-medium">Overview</span>
          <h1 className="font-primary text-4xl font-bold text-brand-primary tracking-tight">Ecosystem Status</h1>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Claims" value={stats?.totalClaims?.toLocaleString()} icon={<FileText size={20} />} delay="100ms" />
        <StatCard title="Today's Claims" value={stats?.todayClaims?.toLocaleString()} icon={<Activity size={20} />} delay="200ms" />
        <StatCard title="Total Value" value={formatCurrency(stats?.totalAmount)} icon={<DollarSign size={20} />} highlight delay="300ms" />
        <StatCard title="Avg Claim Value" value={formatCurrency(stats?.avgAmount)} icon={<Activity size={20} />} delay="400ms" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Claims */}
        <div className="lg:col-span-2 bg-white rounded-md shadow-mega border border-black/5 p-6 flex flex-col gap-4">
          <h2 className="font-primary text-xl font-bold text-brand-primary">Recent Operations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Claim ID</th>
                  <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff</th>
                  <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Dept</th>
                  <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-text-secondary text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentClaims?.length === 0 ? (
                  <tr><td colSpan="4" className="py-8 text-center text-text-secondary text-sm">No recent operations</td></tr>
                ) : (
                  stats?.recentClaims?.map(c => (
                    <tr key={c.id} onClick={() => navigate(`/admin/claim/${c.id}`)} className="border-b border-black/5 hover:bg-neutral-surface cursor-pointer transition-colors group">
                      <td className="py-4 text-xs font-mono text-brand-accent">{c.claim_number}</td>
                      <td className="py-4 text-sm font-semibold text-brand-primary">{c.staff_name}</td>
                      <td className="py-4 text-sm text-text-secondary">{c.department}</td>
                      <td className="py-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(c.grand_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-md shadow-mega border border-black/5 p-6 flex flex-col gap-4">
          <h2 className="font-primary text-xl font-bold text-brand-primary">Audit Trail</h2>
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px]">
            {logs.length === 0 ? (
              <div className="text-center text-text-secondary text-sm py-4">No activity yet</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-l-2 border-brand-accent/20 pl-3 py-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent">{log.action}</span>
                    <span className="text-[10px] text-text-secondary">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm font-medium text-brand-primary">{log.admin_name}</div>
                  <div className="text-xs text-text-secondary">{log.claim_number}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, highlight, delay }) {
  return (
    <div className={`rounded-md p-6 flex flex-col gap-4 shadow-mega transition-transform hover:-translate-y-1 ${highlight ? 'bg-brand-primary text-white border border-white/5' : 'bg-white border border-black/5'}`}>
      <div className="flex justify-between items-center">
        <span className={`text-[10px] font-mono uppercase tracking-widest ${highlight ? 'text-white/60' : 'text-text-secondary'}`}>{title}</span>
        <div className={highlight ? 'text-brand-accent' : 'text-brand-primary'}>{icon}</div>
      </div>
      <div className={`text-3xl font-primary font-bold ${highlight ? 'text-white' : 'text-brand-primary'}`}>{value || '0'}</div>
    </div>
  );
}
