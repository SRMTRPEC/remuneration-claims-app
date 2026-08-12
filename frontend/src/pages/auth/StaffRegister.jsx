import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PopupMessage from '../../components/PopupMessage';

export default function StaffRegister() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirm_password: '',
    staff_name: '',
    staff_initial: '',
    email: '',
    department: '',
    designation: '',
    other_department: '',
    other_designation: '',
    bank_name: '',
    bank_branch: '',
    account_number: '',
    ifsc_code: '',
    staff_type: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [popup, setPopup] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirm_password) {
      setPopup({ type: 'error', message: 'Passwords do not match', onClose: () => setPopup(null) });
      return;
    }

    if (!formData.username || !formData.password || !formData.staff_name || !formData.department || !formData.designation || !formData.email) {
      setPopup({ type: 'error', message: 'Please fill in all required fields', onClose: () => setPopup(null) });
      return;
    }

    if (formData.department === 'Others' && !formData.other_department) {
      setPopup({ type: 'error', message: 'Please specify your other department', onClose: () => setPopup(null) });
      return;
    }

    if (formData.designation === 'Others' && !formData.other_designation) {
      setPopup({ type: 'error', message: 'Please specify your other designation', onClose: () => setPopup(null) });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          confirm_password: formData.confirm_password,
          staff_name: formData.staff_name,
          staff_initial: formData.staff_initial,
          email: formData.email,
          department: formData.department === 'Others' ? formData.other_department : formData.department,
          designation: formData.designation === 'Others' ? formData.other_designation : formData.designation,
          staff_id: formData.username,
          staff_type: formData.staff_type
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPopup({ type: 'error', message: data.error || 'Registration failed', onClose: () => setPopup(null) });
        return;
      }

      setPopup({ 
        type: 'success', 
        message: 'Registration successful!', 
        onClose: () => navigate('/login') 
      });
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setPopup({ type: 'error', message: 'Connection failed. Please try again.', onClose: () => setPopup(null) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <Link to="/" className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary hover:text-brand-accent transition-colors self-start">
        ← Back to Home
      </Link>
      
      <div className="text-center mb-2">
        <h2 className="text-3xl font-primary font-bold text-brand-primary">Create Account</h2>
        <p className="text-xs font-mono uppercase tracking-widest text-text-secondary mt-2">Staff Registration</p>
      </div>

      {popup && (
        <PopupMessage 
          type={popup.type} 
          title={popup.title} 
          message={popup.message} 
          onClose={popup.onClose} 
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff Type *</label>
           <select 
             name="staff_type"
             value={formData.staff_type}
             onChange={handleChange}
             className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors appearance-none"
             required
           >
             <option value="" disabled>Choose an option</option>
             <option value="Internal">Internal (College Faculty)</option>
             <option value="External">External (Guest/Visiting)</option>
           </select>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
              {formData.staff_type === 'Internal' ? 'Staff ID *' : 'Anna University Code *'}
            </label>
            <div className="relative">
              {formData.staff_type === 'Internal' && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-mono font-bold">TRPT</span>
              )}
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full bg-neutral-surface border border-black/5 rounded-md ${formData.staff_type === 'Internal' ? 'pl-14' : 'pl-4'} pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors font-mono`}
                placeholder={formData.staff_type === 'Internal' ? '1234' : 'Enter number'}
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Full Name *</label>
              <input
                type="text"
                name="staff_name"
                value={formData.staff_name}
                onChange={handleChange}
                className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 w-24">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Initial</label>
              <input
                type="text"
                name="staff_initial"
                value={formData.staff_initial}
                onChange={handleChange}
                className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors text-center"
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Department *</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
              required
            >
              <option value="" disabled>Select Department</option>
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
              <option value="Others">Others</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Designation *</label>
            <select
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
              required
            >
              <option value="" disabled>Select Designation</option>
              <option value="Professor">Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Teaching Fellow">Teaching Fellow</option>
              <option value="Guest Lecturer">Guest Lecturer</option>
              <option value="Others">Others</option>
            </select>
          </div>
        </div>

        {formData.department === 'Others' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Please Specify Department *</label>
            <input
              type="text"
              name="other_department"
              value={formData.other_department}
              onChange={handleChange}
              placeholder="Enter your department name"
              className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
              required
            />
          </div>
        )}

        {formData.designation === 'Others' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Please Specify Designation *</label>
            <input
              type="text"
              name="other_designation"
              value={formData.other_designation}
              onChange={handleChange}
              placeholder="Enter your designation"
              className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Confirm *</label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-brand-accent text-white rounded-full py-3.5 text-xs font-mono font-bold tracking-[0.2em] uppercase hover:bg-brand-primary transition-all shadow-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registering...' : 'Create Account'}
        </button>
      </form>
      
      <div className="mt-2 text-center">
        <p className="text-xs text-text-secondary font-secondary">
          Already have an account? <Link to="/login" className="text-brand-accent hover:underline font-semibold">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
