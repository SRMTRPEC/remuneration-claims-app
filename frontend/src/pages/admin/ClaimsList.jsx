import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Trash2, Printer, Eye, Edit2, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ClaimsList() {
  const [claims, setClaims] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState('Internal');
  
  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    designation: '',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: ''
  });
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Departments
  useEffect(() => {
    fetch('/api/admin/departments')
      .then(res => res.json())
      .then(data => setDepartments(data.departments || []))
      .catch(console.error);
  }, []);

  // Load Claims
  useEffect(() => {
    const loadClaims = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pagination.page,
          sort,
          staff_type: activeTab,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
        });

        const res = await fetch(`/api/claims?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setClaims(data.claims || []);
          setPagination(data.pagination);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadClaims();
  }, [pagination.page, sort, debouncedSearch, filters, activeTab]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val || 0);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(claims.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDelete = async (id, claimNum) => {
    if (!window.confirm(`Are you sure you want to delete claim ${claimNum}?`)) return;
    try {
      const res = await fetch(`/api/claims/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClaims(claims.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportAll = () => window.location.href = '/api/export/all';
  
  const handleExportSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch('/api/export/selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Selected_Claims_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-brand-accent mb-2 block font-medium">Database</span>
          <h1 className="font-primary text-4xl font-bold text-brand-primary tracking-tight">Claims Ledger</h1>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleExportAll} className="flex items-center gap-2 bg-neutral-surface border border-black/5 text-brand-primary px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-white shadow-sm transition-all">
            <Download size={14} /> Export All
          </button>
          <button onClick={handleExportSelected} disabled={selectedIds.size === 0} className="flex items-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-brand-primary shadow-accent transition-all disabled:opacity-50">
            <Download size={14} /> Export Selected ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/5 gap-6">
        <button 
          onClick={() => { setActiveTab('Internal'); setPagination(p => ({...p, page: 1})); setSelectedIds(new Set()); }}
          className={`pb-3 text-sm font-mono uppercase tracking-widest transition-colors relative ${activeTab === 'Internal' ? 'text-brand-primary font-bold' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          Internal Staff
          {activeTab === 'Internal' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent"></div>}
        </button>
        <button 
          onClick={() => { setActiveTab('External'); setPagination(p => ({...p, page: 1})); setSelectedIds(new Set()); }}
          className={`pb-3 text-sm font-mono uppercase tracking-widest transition-colors relative ${activeTab === 'External' ? 'text-brand-primary font-bold' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          External Staff
          {activeTab === 'External' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent"></div>}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-md shadow-mega border border-black/5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Search claims..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-surface border border-black/5 rounded-md text-sm focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-md transition-colors ${showFilters ? 'bg-brand-accent text-white' : 'bg-neutral-surface text-brand-primary hover:bg-gray-200'}`}>
            <Filter size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-widest text-text-secondary">Sort:</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-neutral-surface border border-black/5 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-brand-accent transition-colors">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-md shadow-mega border border-black/5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Department</label>
            <select value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} className="bg-neutral-surface border border-black/5 rounded-md px-3 py-2 text-sm">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Designation</label>
            <input type="text" value={filters.designation} onChange={e => setFilters({...filters, designation: e.target.value})} className="bg-neutral-surface border border-black/5 rounded-md px-3 py-2 text-sm" placeholder="e.g. Professor" />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5 w-1/2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Min Amount</label>
              <input type="number" value={filters.amount_min} onChange={e => setFilters({...filters, amount_min: e.target.value})} className="bg-neutral-surface border border-black/5 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5 w-1/2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Max Amount</label>
              <input type="number" value={filters.amount_max} onChange={e => setFilters({...filters, amount_max: e.target.value})} className="bg-neutral-surface border border-black/5 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Claims Table */}
      <div className="bg-white rounded-md shadow-mega border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-surface border-b border-black/5">
              <tr>
                <th className="p-4 w-12"><input type="checkbox" onChange={handleSelectAll} checked={claims.length > 0 && selectedIds.size === claims.length} /></th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Claim ID</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Date</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Dept</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary text-right">Value</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center text-text-secondary">Loading...</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-text-secondary">No claims found</td></tr>
              ) : (
                claims.map(c => (
                  <tr key={c.id} className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                    <td className="p-4"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => handleSelect(c.id)} /></td>
                    <td className="p-4 text-xs font-mono text-brand-accent">{c.claim_number}</td>
                    <td className="p-4 text-xs text-text-secondary">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-sm font-semibold text-brand-primary">{c.staff_name}</td>
                    <td className="p-4 text-sm text-text-secondary">{c.department}</td>
                    <td className="p-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(c.grand_total)}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => navigate(`/admin/claim/${c.id}`)} className="p-1.5 text-text-secondary hover:text-brand-accent hover:bg-brand-accent/10 rounded transition-colors" title="View"><Eye size={16} /></button>
                        <button onClick={() => navigate(`/admin/claim/${c.id}?edit=true`)} className="p-1.5 text-text-secondary hover:text-brand-accent hover:bg-brand-accent/10 rounded transition-colors" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(c.id, c.claim_number)} className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-black/5 flex justify-between items-center bg-neutral-surface">
          <span className="text-xs text-text-secondary">Showing {claims.length} of {pagination.total} claims</span>
          <div className="flex gap-1">
            <button disabled={pagination.page <= 1} onClick={() => setPagination({...pagination, page: pagination.page - 1})} className="p-1.5 bg-white rounded border border-black/5 disabled:opacity-50"><ChevronLeft size={16} /></button>
            <span className="px-3 py-1.5 text-sm font-mono">{pagination.page} / {pagination.totalPages || 1}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination({...pagination, page: pagination.page + 1})} className="p-1.5 bg-white rounded border border-black/5 disabled:opacity-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
