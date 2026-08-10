import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Key, Search, Trash2, Edit2, Eye, X, Download } from 'lucide-react';

export default function UsersList() {
  const [activeTab, setActiveTab] = useState('internal_staff');
  const [staff, setStaff] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [viewStaff, setViewStaff] = useState(null);
  const [editStaff, setEditStaff] = useState(null);
  const [editForm, setEditForm] = useState({ staff_id: '', staff_name: '', department: '', designation: '', other_designation: '', staff_type: 'Internal' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Add Staff Modal States
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [addForm, setAddForm] = useState({ staff_id: '', staff_name: '', department: '', designation: '', other_designation: '', staff_type: 'Internal', password: '' });
  const [isAdding, setIsAdding] = useState(false);
  
  // Add Admin Modal States
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addAdminForm, setAddAdminForm] = useState({ username: '', password: '', confirm_password: '' });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  
  // Password Reset States
  const [resetUserStr, setResetUserStr] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [staffRes, adminRes] = await Promise.all([
          fetch('/api/admin/users/staff'),
          fetch('/api/admin/users/admins')
        ]);
        
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setStaff(staffData.staff || []);
        }
        
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setAdmins(adminData.admins || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/staff/${id}`, { method: 'DELETE' });
      if (res.ok) setStaff(staff.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete admin ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/admins/${id}`, { method: 'DELETE' });
      if (res.ok) setAdmins(admins.filter(a => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleExportUsers = () => {
    window.location.href = '/api/export/users';
  };

  const openEditModal = (s) => {
    setEditForm({
      staff_id: s.staff_id,
      staff_name: s.staff_name,
      department: s.department,
      designation: ['Professor', 'Associate Professor', 'Assistant Professor'].includes(s.designation) ? s.designation : (s.designation ? 'Others' : ''),
      other_designation: ['Professor', 'Associate Professor', 'Assistant Professor'].includes(s.designation) ? '' : s.designation,
      staff_type: s.staff_type || 'Internal',
    });
    setEditStaff(s);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const submitEditStaff = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { ...editForm, designation: editForm.designation === 'Others' ? editForm.other_designation : editForm.designation };
    try {
      const res = await fetch(`/api/admin/users/staff/${editStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(staff.map(s => s.id === editStaff.id ? data.staff : s));
        setEditStaff(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update staff');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetUserStr || !resetPassword || !resetConfirm) return alert('All fields required');
    if (resetPassword !== resetConfirm) return alert('Passwords do not match');
    if (resetPassword.length < 6) return alert('Password must be at least 6 characters');
    
    const staffIdMatch = resetUserStr.split(' - ')[0];
    const user = staff.find(s => s.staff_id === staffIdMatch);
    if (!user) return alert('Please select a valid user from the list');

    setIsResetting(true);
    try {
      const res = await fetch(`/api/admin/users/staff/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password updated successfully');
        setResetUserStr('');
        setResetPassword('');
        setResetConfirm('');
      } else {
        alert(data.error || 'Failed to update password');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsResetting(false);
    }
  };

  const openAddModal = () => {
    setAddForm({ staff_id: '', staff_name: '', email: '', department: '', designation: '', other_designation: '', staff_type: 'Internal', password: '' });
    setShowAddStaff(true);
  };

  const handleAddChange = (e) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const submitAddStaff = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    const payload = { ...addForm, designation: addForm.designation === 'Others' ? addForm.other_designation : addForm.designation };
    try {
      const res = await fetch('/api/admin/users/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setStaff([...staff, data.staff]);
        setShowAddStaff(false);
      } else {
        alert(data.error || 'Failed to add staff');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsAdding(false);
    }
  };

  const openAddAdminModal = () => {
    setAddAdminForm({ username: '', password: '', confirm_password: '' });
    setShowAddAdmin(true);
  };

  const handleAddAdminChange = (e) => {
    setAddAdminForm({ ...addAdminForm, [e.target.name]: e.target.value });
  };

  const submitAddAdmin = async (e) => {
    e.preventDefault();
    if (addAdminForm.password !== addAdminForm.confirm_password) {
      return alert('Passwords do not match');
    }
    
    setIsAddingAdmin(true);
    try {
      const res = await fetch(`/api/admin/users/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addAdminForm)
      });
      const data = await res.json();
      if (res.ok) {
        setAdmins([...admins, data.admin]);
        setShowAddAdmin(false);
      } else {
        alert(data.error || 'Failed to create admin');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    const isInternal = s.staff_type !== 'External';
    if (activeTab === 'internal_staff' && !isInternal) return false;
    if (activeTab === 'external_staff' && isInternal) return false;
    
    return s.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           s.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.designation?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const internalCount = staff.filter(s => s.staff_type !== 'External').length;
  const externalCount = staff.filter(s => s.staff_type === 'External').length;

  return (
    <div className="flex flex-col gap-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-brand-accent mb-2 block font-medium">Directory</span>
          <h1 className="font-primary text-4xl font-bold text-brand-primary tracking-tight">Access Control</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/5">
        <button 
          onClick={() => setActiveTab('internal_staff')}
          className={`px-6 py-4 font-mono text-[10px] uppercase tracking-widest font-bold transition-all relative ${activeTab === 'internal_staff' ? 'text-brand-primary' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          Internal Staff ({internalCount})
          {activeTab === 'internal_staff' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab('external_staff')}
          className={`px-6 py-4 font-mono text-[10px] uppercase tracking-widest font-bold transition-all relative ${activeTab === 'external_staff' ? 'text-brand-primary' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          External Staff ({externalCount})
          {activeTab === 'external_staff' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab('admins')}
          className={`px-6 py-4 font-mono text-[10px] uppercase tracking-widest font-bold transition-all relative ${activeTab === 'admins' ? 'text-brand-primary' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          Administrators ({admins.length})
          {activeTab === 'admins' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab('passwords')}
          className={`px-6 py-4 font-mono text-[10px] uppercase tracking-widest font-bold transition-all relative ${activeTab === 'passwords' ? 'text-brand-primary' : 'text-text-secondary hover:text-brand-primary'}`}
        >
          Password Management
          {activeTab === 'passwords' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent" />}
        </button>
      </div>

      {/* Tab Content: Staff */}
      {(activeTab === 'internal_staff' || activeTab === 'external_staff') && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-mega border border-black/5">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search staff..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-surface border border-black/5 rounded-md text-sm focus:outline-none focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleExportUsers} className="flex items-center gap-2 bg-neutral-surface border border-black/5 text-brand-primary px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-white shadow-sm transition-all">
                <Download size={14} /> Export
              </button>
              <button onClick={openAddModal} className="flex items-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-brand-primary shadow-accent transition-all">
                <UserPlus size={14} /> Add Staff
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-md shadow-mega border border-black/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-surface border-b border-black/5">
                <tr>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff ID</th>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Name</th>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Type</th>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Department</th>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Designation</th>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-text-secondary">Loading...</td></tr>
                ) : filteredStaff.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-text-secondary">No staff found</td></tr>
                ) : (
                  filteredStaff.map(s => (
                    <tr key={s.id} className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                      <td className="p-4 text-xs font-mono font-bold text-brand-primary">{s.staff_id}</td>
                      <td className="p-4 text-sm text-brand-primary">{s.staff_name}</td>
                      <td className="p-4 text-xs text-text-secondary">{s.staff_type || 'Internal'}</td>
                      <td className="p-4 text-xs text-text-secondary">{s.department}</td>
                      <td className="p-4 text-xs text-text-secondary">{s.designation}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setViewStaff(s)} className="p-1.5 text-text-secondary hover:text-brand-accent hover:bg-brand-accent/10 rounded transition-colors"><Eye size={16} /></button>
                          <button onClick={() => openEditModal(s)} className="p-1.5 text-text-secondary hover:text-brand-accent hover:bg-brand-accent/10 rounded transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteStaff(s.id, s.staff_name)} className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Admins */}
      {activeTab === 'admins' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex justify-end items-center bg-white p-4 rounded-md shadow-mega border border-black/5">
            <button onClick={openAddAdminModal} className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-brand-accent shadow-sm transition-all">
              <Shield size={14} /> Create Admin
            </button>
          </div>
          
          <div className="bg-white rounded-md shadow-mega border border-black/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-surface border-b border-black/5">
                <tr>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Username</th>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Created</th>
                  <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" className="p-8 text-center text-text-secondary">Loading...</td></tr>
                ) : admins.length === 0 ? (
                  <tr><td colSpan="3" className="p-8 text-center text-text-secondary">No admins found</td></tr>
                ) : (
                  admins.map(a => (
                    <tr key={a.id} className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-brand-primary">{a.username}</td>
                      <td className="p-4 text-xs text-text-secondary">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteAdmin(a.id, a.username)} className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Passwords */}
      {activeTab === 'passwords' && (
        <div className="bg-white rounded-md shadow-mega border border-black/5 p-8 max-w-xl animate-fade-in">
           <h2 className="font-primary text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
             <Key size={20} className="text-brand-accent" /> Password Reset
           </h2>
           <form className="flex flex-col gap-5" onSubmit={handlePasswordReset}>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Select User</label>
               <input 
                 list="staff-list" 
                 value={resetUserStr}
                 onChange={e => setResetUserStr(e.target.value)}
                 placeholder="Search by name or ID..." 
                 className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" 
                 required
               />
               <datalist id="staff-list">
                 {staff.map(s => (
                   <option key={s.id} value={`${s.staff_id} - ${s.staff_name}`} />
                 ))}
               </datalist>
             </div>
             
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">New Password</label>
               <input 
                 type="password" 
                 value={resetPassword}
                 onChange={e => setResetPassword(e.target.value)}
                 placeholder="••••••••" 
                 className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" 
                 required
                 minLength={6}
               />
             </div>
             
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Confirm Password</label>
               <input 
                 type="password" 
                 value={resetConfirm}
                 onChange={e => setResetConfirm(e.target.value)}
                 placeholder="••••••••" 
                 className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" 
                 required
                 minLength={6}
               />
             </div>

             <button 
               type="submit" 
               disabled={isResetting}
               className="mt-4 w-full bg-brand-accent text-white rounded-full py-3 text-xs font-mono font-bold tracking-[0.2em] uppercase hover:bg-brand-primary transition-all shadow-accent disabled:opacity-50"
             >
               {isResetting ? 'Updating...' : 'Update Password'}
             </button>
           </form>
        </div>
      )}

      {/* View Staff Modal */}
      {viewStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-mega max-w-md w-full animate-fade-in overflow-hidden flex flex-col">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-neutral-surface">
              <h2 className="font-primary text-xl font-bold text-brand-primary tracking-tight">Staff Profile</h2>
              <button onClick={() => setViewStaff(null)} className="text-text-secondary hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Full Name</span>
                <p className="font-semibold text-brand-primary text-lg">{viewStaff.staff_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Staff ID</span>
                <p className="font-mono text-brand-primary">{viewStaff.staff_id}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Staff Type</span>
                <p className="text-brand-primary">{viewStaff.staff_type || 'Internal'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Email</span>
                <p className="text-brand-primary">{viewStaff.email || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Department</span>
                <p className="text-brand-primary">{viewStaff.department}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Designation</span>
                <p className="text-brand-primary">{viewStaff.designation}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary block mb-1">Date Joined</span>
                <p className="text-brand-primary">{new Date(viewStaff.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="p-4 border-t border-black/5 flex justify-end bg-neutral-surface">
              <button onClick={() => setViewStaff(null)} className="bg-brand-primary text-white px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-brand-accent transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-mega max-w-md w-full animate-fade-in overflow-hidden flex flex-col">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-neutral-surface">
              <h2 className="font-primary text-xl font-bold text-brand-primary tracking-tight">Edit Staff Profile</h2>
              <button onClick={() => setEditStaff(null)} className="text-text-secondary hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitEditStaff} className="flex flex-col">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Full Name</label>
                  <input type="text" name="staff_name" value={editForm.staff_name} onChange={handleEditChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Email Address</label>
                  <input type="email" name="email" value={editForm.email || ''} onChange={handleEditChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff ID / Univ No</label>
                  <input type="text" name="staff_id" value={editForm.staff_id} onChange={handleEditChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors font-mono" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff Type</label>
                  <select name="staff_type" value={editForm.staff_type} onChange={handleEditChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors">
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Department</label>
                  <select name="department" value={editForm.department} onChange={handleEditChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors">
                    <option value="Artificial Intelligence and Data Science (AIDS)">Artificial Intelligence and Data Science (AIDS)</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
                    <option value="Electrical and Electronics Engineering (EEE)">Electrical and Electronics Engineering (EEE)</option>
                    <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE)</option>
                    <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Master of Business Administration (MBA)">Master of Business Administration (MBA)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Designation</label>
                  <select name="designation" value={editForm.designation} onChange={handleEditChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors">
                    <option value="" disabled>Select Designation</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                {editForm.designation === 'Others' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Please Specify Designation</label>
                    <input type="text" name="other_designation" value={editForm.other_designation} onChange={handleEditChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-black/5 flex justify-end gap-2 bg-neutral-surface">
                <button type="button" onClick={() => setEditStaff(null)} className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-text-secondary hover:text-brand-primary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="bg-brand-accent text-white px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-brand-primary shadow-sm transition-all disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-mega max-w-md w-full animate-fade-in overflow-hidden flex flex-col">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-neutral-surface">
              <h2 className="font-primary text-xl font-bold text-brand-primary tracking-tight">Add New Staff</h2>
              <button onClick={() => setShowAddStaff(false)} className="text-text-secondary hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitAddStaff} className="flex flex-col">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Full Name</label>
                  <input type="text" name="staff_name" value={addForm.staff_name} onChange={handleAddChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Email Address</label>
                  <input type="email" name="email" value={addForm.email} onChange={handleAddChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff ID / Univ No</label>
                  <input type="text" name="staff_id" value={addForm.staff_id} onChange={handleAddChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors font-mono" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff Type</label>
                  <select name="staff_type" value={addForm.staff_type} onChange={handleAddChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors">
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Department</label>
                  <select name="department" value={addForm.department} onChange={handleAddChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors">
                    <option value="">Select Department</option>
                    <option value="Artificial Intelligence and Data Science (AIDS)">Artificial Intelligence and Data Science (AIDS)</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
                    <option value="Electrical and Electronics Engineering (EEE)">Electrical and Electronics Engineering (EEE)</option>
                    <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE)</option>
                    <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Master of Business Administration (MBA)">Master of Business Administration (MBA)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Designation</label>
                  <select name="designation" value={addForm.designation} onChange={handleAddChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors">
                    <option value="">Select Designation</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                {addForm.designation === 'Others' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Please Specify Designation</label>
                    <input type="text" name="other_designation" value={addForm.other_designation} onChange={handleAddChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Temporary Password</label>
                  <input type="password" name="password" value={addForm.password} onChange={handleAddChange} required minLength={6} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
              </div>
              <div className="p-4 border-t border-black/5 flex justify-end gap-2 bg-neutral-surface">
                <button type="button" onClick={() => setShowAddStaff(false)} className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-text-secondary hover:text-brand-primary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isAdding} className="bg-brand-accent text-white px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-brand-primary shadow-sm transition-all disabled:opacity-50">
                  {isAdding ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-mega max-w-sm w-full animate-fade-in overflow-hidden flex flex-col">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-neutral-surface">
              <h2 className="font-primary text-xl font-bold text-brand-primary tracking-tight">Create Admin</h2>
              <button onClick={() => setShowAddAdmin(false)} className="text-text-secondary hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitAddAdmin} className="flex flex-col">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Username</label>
                  <input type="text" name="username" value={addAdminForm.username} onChange={handleAddAdminChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Password</label>
                  <input type="password" name="password" value={addAdminForm.password} onChange={handleAddAdminChange} required minLength={6} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Confirm Password</label>
                  <input type="password" name="confirm_password" value={addAdminForm.confirm_password} onChange={handleAddAdminChange} required minLength={6} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
              </div>
              <div className="p-4 border-t border-black/5 flex justify-end gap-2 bg-neutral-surface">
                <button type="button" onClick={() => setShowAddAdmin(false)} className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-text-secondary hover:text-brand-primary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isAddingAdmin} className="bg-brand-primary text-white px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-brand-accent shadow-sm transition-all disabled:opacity-50">
                  {isAddingAdmin ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
