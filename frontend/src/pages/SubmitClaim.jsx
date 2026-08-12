import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Calculator, ShieldCheck, CheckCircle2, ChevronRight, Upload, BookOpen, Search, CheckSquare, Microscope, Presentation, ShieldAlert } from 'lucide-react';
import PopupMessage from '../components/PopupMessage';

export default function SubmitClaim() {
  const [user, setUser] = useState(null);
  const [staffType, setStaffType] = useState('Internal');
  const [popup, setPopup] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.role === 'staff') {
          setUser(data.user);
          setStaffType(data.user.staff_type || 'Internal');
          setFormData(prev => ({
            ...prev,
            staff_name: data.user.staff_name || '',
            staff_id: (data.user.staff_id || '').replace(/^TRPT/i, ''),
            department: data.user.department || '',
            designation: data.user.designation || ''
          }));
        } else {
          navigate('/login');
        }
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  const [formData, setFormData] = useState({
    staff_name: '', staff_id: '', department: '', designation: '', other_designation: '',
    bank_name: '', bank_branch: '', account_number: '', ifsc_code: '', mobile_number: '',
    
    qp_enabled: false, qp_type: '', qp_quantity: 0,
    scrutiny_enabled: false, scrutiny_quantity: 0,
    
    eval_enabled: false, 
    eval_phase1: false, eval_phase2: false,
    eval1_1_appt: '', eval1_1_scripts: 0,
    eval1_2_appt: '', eval1_2_scripts: 0,
    eval2_1_appt: '', eval2_1_scripts: 0,

    practical_enabled: false, practical_type: '', practical_candidates: 0,
    project_enabled: false, project_course: '', project_candidates: 0,
    practical_squad_enabled: false, practical_squad_sessions: 0,
    
    squad_enabled: false, 
    squad_forenoon: 0, squad_afternoon: 0, squad_both: 0,
  });

  const [amounts, setAmounts] = useState({ qp: 0, scrutiny: 0, eval: 0, squad: 0, practical: 0, project: 0, practical_squad: 0 });
  const [grandTotal, setGrandTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'mobile_number' || name === 'account_number') {
      const numericValue = value.replace(/\D/g, '');
      if (name === 'mobile_number' && numericValue.length > 10) return;
      if (name === 'account_number' && numericValue.length > 20) return;
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }

    if (type === 'number') {
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: '' }));
        return;
      }
      const val = Number(value);
      if (val < 0) return;
      setFormData(prev => ({ ...prev, [name]: val }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, passbook_file: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({ ...prev, passbook_file: null }));
    }
  };

  useEffect(() => {
    let total = 0;
    const newAmounts = { qp: 0, scrutiny: 0, eval: 0, squad: 0, practical: 0, project: 0, practical_squad: 0 };
    const isExt = staffType === 'External';

    if (formData.qp_enabled) {
      const qpRate = formData.qp_type === 'qp_with_answer_key' ? (isExt ? 2000 : 1500) : (isExt ? 1000 : 750);
      newAmounts.qp = (parseInt(formData.qp_quantity) || 0) * qpRate;
      total += newAmounts.qp;
    }
    
    if (formData.scrutiny_enabled) {
      newAmounts.scrutiny = (parseInt(formData.scrutiny_quantity) || 0) * 300;
      total += newAmounts.scrutiny;
    }

    if (formData.eval_enabled) {
      let eTotal = 0;
      if (formData.eval_phase1) {
        if (formData.eval1_1_appt) eTotal += (parseInt(formData.eval1_1_scripts) || 0) * (formData.eval1_1_appt === 'Board Chairman/Chief Examiner' ? 33 : 30);
        if (formData.eval1_2_appt) eTotal += (parseInt(formData.eval1_2_scripts) || 0) * (formData.eval1_2_appt === 'Board Chairman/Chief Examiner' ? 33 : 30);
      }
      if (formData.eval_phase2) {
        if (formData.eval2_1_appt) eTotal += (parseInt(formData.eval2_1_scripts) || 0) * (formData.eval2_1_appt === 'Board Chairman/Chief Examiner' ? 33 : 30);
      }
      newAmounts.eval = eTotal;
      total += eTotal;
    }

    if (formData.practical_enabled) {
      let practicalRate = 0;
      if (formData.practical_type === 'UG') practicalRate = 30;
      else if (formData.practical_type === 'PG') practicalRate = 40;
      else if (formData.practical_type === 'Ph.D') practicalRate = isExt ? 3000 : 2500;
      newAmounts.practical = (parseInt(formData.practical_candidates) || 0) * practicalRate;
      total += newAmounts.practical;
    }

    if (formData.project_enabled) {
      let projectRate = 0;
      if (formData.project_course === 'M.E') projectRate = isExt ? 250 : 75;
      else if (formData.project_course === 'MBA') projectRate = isExt ? 200 : 50;
      else if (formData.project_course === 'B.E/B.Tech') projectRate = 30;
      newAmounts.project = (parseInt(formData.project_candidates) || 0) * projectRate;
      total += newAmounts.project;
    }

    if (formData.practical_squad_enabled) {
      newAmounts.practical_squad = (parseInt(formData.practical_squad_sessions) || 0) * 150;
      total += newAmounts.practical_squad;
    }

    if (formData.squad_enabled) {
      newAmounts.squad = (parseInt(formData.squad_forenoon) || 0) * 200 + (parseInt(formData.squad_afternoon) || 0) * 200 + (parseInt(formData.squad_both) || 0) * 400;
      total += newAmounts.squad;
    }

    setAmounts(newAmounts);
    setGrandTotal(total);
  }, [formData, staffType]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Manual Validation
    const requiredFields = ['staff_name', 'staff_id', 'department', 'designation', 'bank_name', 'bank_branch', 'account_number', 'ifsc_code', 'mobile_number'];
    const missingFields = requiredFields.filter(f => !formData[f]);
    
    if (missingFields.length > 0) {
      setPopup({ type: 'error', message: `Please fill in all required fields. Missing: ${missingFields.join(', ')}`, onClose: () => setPopup(null) });
      return;
    }



    if (!formData.passbook_file) {
      setPopup({ type: 'error', message: 'Please upload a copy of your bank passbook', onClose: () => setPopup(null) });
      return;
    }

    if (grandTotal === 0) {
      setPopup({ type: 'error', message: 'Please select at least one claim item', onClose: () => setPopup(null) });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        staff_id: staffType === 'External' ? formData.staff_id : 'TRPT' + formData.staff_id,
        designation: formData.designation,
        eval_sessions: (() => {
          let sessions = [];
          if (formData.eval_phase1) {
            if (formData.eval1_1_appt || formData.eval1_1_scripts > 0) sessions.push({ phase: 'Phase 1', appointment: formData.eval1_1_appt || null, date: '20-06-2026', scripts: formData.eval1_1_scripts || 0 });
            if (formData.eval1_2_appt || formData.eval1_2_scripts > 0) sessions.push({ phase: 'Phase 1', appointment: formData.eval1_2_appt || null, date: '21-06-2026', scripts: formData.eval1_2_scripts || 0 });
          }
          if (formData.eval_phase2) {
            if (formData.eval2_1_appt || formData.eval2_1_scripts > 0) sessions.push({ phase: 'Phase 2', appointment: formData.eval2_1_appt || null, date: '01-07-2026', scripts: formData.eval2_1_scripts || 0 });
          }
          return sessions;
        })(),
        squad_sessions: formData.squad_enabled ? {
          Forenoon: parseInt(formData.squad_forenoon) || 0,
          Afternoon: parseInt(formData.squad_afternoon) || 0,
          "Both Sessions": parseInt(formData.squad_both) || 0
        } : null,
        staff_section_enabled: true
      };
      
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setPopup({ 
          type: 'success', 
          message: 'Claim submitted successfully!', 
          onClose: () => window.location.reload() 
        });
      } else {
        const data = await res.json();
        setPopup({ type: 'error', message: `Error: ${data.error || 'Submission failed'}`, onClose: () => setPopup(null) });
      }
    } catch (err) {
      setPopup({ type: 'error', message: 'Network error', onClose: () => setPopup(null) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

  const isExt = staffType === 'External';
  const qpRate = formData.qp_type === 'qp_with_answer_key' ? (isExt ? 2000 : 1500) : (formData.qp_type ? (isExt ? 1000 : 750) : 0);
  const eval11Rate = formData.eval1_1_appt === 'Board Chairman/Chief Examiner' ? 33 : (formData.eval1_1_appt ? 30 : 0);
  const eval12Rate = formData.eval1_2_appt === 'Board Chairman/Chief Examiner' ? 33 : (formData.eval1_2_appt ? 30 : 0);
  const eval21Rate = formData.eval2_1_appt === 'Board Chairman/Chief Examiner' ? 33 : (formData.eval2_1_appt ? 30 : 0);
  const practicalRate = formData.practical_type === 'UG' ? 30 : (formData.practical_type === 'PG' ? 40 : (formData.practical_type === 'Ph.D' ? (isExt ? 3000 : 2500) : 0));
  const projectRate = formData.project_course === 'M.E' ? (isExt ? 250 : 75) : (formData.project_course === 'MBA' ? (isExt ? 200 : 50) : (formData.project_course === 'B.E/B.Tech' ? 30 : 0));

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 relative">
      {popup && (
        <PopupMessage 
          type={popup.type} 
          title={popup.title} 
          message={popup.message} 
          onClose={popup.onClose} 
        />
      )}
      <Link to="/dashboard" className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary hover:text-brand-accent transition-colors self-start mb-8">
        ← Back to Dashboard
      </Link>
      <div className="mb-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-brand-accent mb-2 block font-medium">Digital Form</span>
        <h1 className="font-primary text-4xl font-bold text-brand-primary tracking-tight">Remuneration Claim</h1>
        {user && <p className="text-text-secondary mt-2">Welcome, {user.staff_name}</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        
        {/* Profile Section */}
        <div className="bg-white rounded-md shadow-mega border border-black/5 p-8">
          <h2 className="font-primary text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
            <ShieldCheck className="text-brand-accent" size={20} /> Personal Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Full Name *</label>
              <input type="text" name="staff_name" value={formData.staff_name} onChange={handleChange} readOnly className="w-full bg-neutral-surface/50 border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors cursor-not-allowed opacity-70" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                {staffType === 'Internal' ? 'Staff ID *' : 'Anna University Code *'}
              </label>
              <div className="relative">
                {staffType === 'Internal' && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-mono font-bold opacity-70">TRPT</span>
                )}
                <input type="text" name="staff_id" value={formData.staff_id} onChange={handleChange} readOnly className={`w-full bg-neutral-surface/50 border border-black/5 rounded-md ${staffType === 'Internal' ? 'pl-14' : 'pl-4'} pr-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors font-mono cursor-not-allowed opacity-70`} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff Type</label>
              <input type="text" value={staffType} readOnly className="w-full bg-neutral-surface/50 border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors cursor-not-allowed opacity-70 font-mono font-bold" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Department *</label>
              <select name="department" value={formData.department} onChange={handleChange} disabled className="w-full bg-neutral-surface/50 border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors cursor-not-allowed opacity-70">
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
              </select>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Designation *</label>
              <input type="text" name="designation" value={formData.designation} onChange={handleChange} disabled className="w-full bg-neutral-surface/50 border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors cursor-not-allowed opacity-70" />
            </div>
          </div>
        </div>

        {/* Financial Section */}
        <div className="bg-white rounded-md shadow-mega border border-black/5 p-8">
          <h2 className="font-primary text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
            <Calculator className="text-brand-accent" size={20} /> Financial Routing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Bank Name *</label>
              <select name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors">
                <option value="" disabled>Select Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Canara Bank">Canara Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Union Bank of India">Union Bank of India</option>
                <option value="Bank of India">Bank of India</option>
                <option value="Indian Bank">Indian Bank</option>
                <option value="Central Bank of India">Central Bank of India</option>
                <option value="Indian Overseas Bank">Indian Overseas Bank</option>
                <option value="UCO Bank">UCO Bank</option>
                <option value="Bank of Maharashtra">Bank of Maharashtra</option>
                <option value="Punjab & Sind Bank">Punjab & Sind Bank</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                <option value="IndusInd Bank">IndusInd Bank</option>
                <option value="Yes Bank">Yes Bank</option>
                <option value="IDBI Bank">IDBI Bank</option>
                <option value="Federal Bank">Federal Bank</option>
                <option value="South Indian Bank">South Indian Bank</option>
                <option value="Karur Vysya Bank">Karur Vysya Bank</option>
                <option value="City Union Bank">City Union Bank</option>
                <option value="Tamilnad Mercantile Bank">Tamilnad Mercantile Bank</option>
                <option value="Equitas Small Finance Bank">Equitas Small Finance Bank</option>
                <option value="Ujjivan Small Finance Bank">Ujjivan Small Finance Bank</option>
                <option value="Paytm Payments Bank">Paytm Payments Bank</option>
                <option value="India Post Payments Bank">India Post Payments Bank</option>
                <option value="Other">Other / Co-operative Bank</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Branch Name *</label>
              <input type="text" name="bank_branch" value={formData.bank_branch} onChange={handleChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Account Number *</label>
              <input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">IFSC Code *</label>
              <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Mobile Number *</label>
              <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Passbook Photo / PDF *</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-accent/10 file:text-brand-primary hover:file:bg-brand-accent/20 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Duties Section */}
        <div className="bg-white rounded-md shadow-mega border border-black/5 p-8">
          <h2 className="font-primary text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
            <FileText className="text-brand-accent" size={20} /> Duties Performed
          </h2>
          
          <div className="flex flex-col gap-4">
            
            {/* QP Setting */}
            <div className="border border-black/5 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="qp_enabled" checked={formData.qp_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                  <BookOpen size={16} className="text-blue-500" />
                  <span className="font-semibold text-brand-primary">Question Paper Setting</span>
                </div>
                {formData.qp_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.qp)}</span>}
              </div>
              {formData.qp_enabled && (
                <div className="mt-4 grid grid-cols-2 gap-4 pl-7">
                  <select name="qp_type" value={formData.qp_type} onChange={handleChange} className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm">
                    <option value="">Select Type</option>
                    <option value="qp_with_answer_key">QP + Answer Key</option>
                    <option value="qp_only">QP Only</option>
                    <option value="answer_key_only">Answer Key Only</option>
                  </select>
                  <div className="flex flex-col gap-1">
                    <input type="number" name="qp_quantity" value={formData.qp_quantity} onChange={handleChange} placeholder="Quantity" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm w-full" />
                    {qpRate > 0 && <span className="text-[10px] text-brand-primary/60 font-mono font-bold pl-1">RATE: ₹{qpRate} EACH</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Scrutiny */}
            <div className="border border-black/5 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="scrutiny_enabled" checked={formData.scrutiny_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                  <Search size={16} className="text-purple-500" />
                  <span className="font-semibold text-brand-primary">Paper Scrutiny</span>
                </div>
                {formData.scrutiny_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.scrutiny)}</span>}
              </div>
              {formData.scrutiny_enabled && (
                <div className="mt-4 pl-7">
                  <input type="number" name="scrutiny_quantity" value={formData.scrutiny_quantity} onChange={handleChange} placeholder="Quantity (₹300 each)" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                </div>
              )}
            </div>

            {/* Eval */}
            <div className="border border-black/5 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="eval_enabled" checked={formData.eval_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                  <CheckSquare size={16} className="text-emerald-500" />
                  <span className="font-semibold text-brand-primary">Script Evaluation</span>
                </div>
                {formData.eval_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.eval)}</span>}
              </div>
              {formData.eval_enabled && (
                <div className="mt-4 pl-7 flex flex-col gap-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-primary">
                      <input type="checkbox" name="eval_phase1" checked={formData.eval_phase1} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                      Phase 1
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-primary">
                      <input type="checkbox" name="eval_phase2" checked={formData.eval_phase2} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                      Phase 2
                    </label>
                  </div>

                  {formData.eval_phase1 && (
                    <div className="bg-neutral-surface/30 border border-black/5 rounded-md p-4 flex flex-col gap-4">
                      <div className="text-xs font-mono uppercase tracking-widest text-text-secondary">Phase 1 Details</div>
                      
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-brand-primary">20-06-2026</span>
                        <div className="grid grid-cols-2 gap-4">
                          <select name="eval1_1_appt" value={formData.eval1_1_appt} onChange={handleChange} className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm">
                            <option value="">Select Appointment</option>
                            <option value="Board Chairman/Chief Examiner">Board Chairman/Chief Examiner</option>
                            <option value="Examiner">Examiner</option>
                            <option value="Assistant Examiner">Assistant Examiner</option>
                          </select>
                          <div className="flex flex-col gap-1">
                            <input type="number" name="eval1_1_scripts" value={formData.eval1_1_scripts} onChange={handleChange} placeholder="Scripts" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm w-full" />
                            {eval11Rate > 0 && <span className="text-[10px] text-brand-primary/60 font-mono font-bold pl-1">RATE: ₹{eval11Rate} EACH</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-brand-primary">21-06-2026</span>
                        <div className="grid grid-cols-2 gap-4">
                          <select name="eval1_2_appt" value={formData.eval1_2_appt} onChange={handleChange} className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm">
                            <option value="">Select Appointment</option>
                            <option value="Board Chairman/Chief Examiner">Board Chairman/Chief Examiner</option>
                            <option value="Examiner">Examiner</option>
                            <option value="Assistant Examiner">Assistant Examiner</option>
                          </select>
                          <div className="flex flex-col gap-1">
                            <input type="number" name="eval1_2_scripts" value={formData.eval1_2_scripts} onChange={handleChange} placeholder="Scripts" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm w-full" />
                            {eval12Rate > 0 && <span className="text-[10px] text-brand-primary/60 font-mono font-bold pl-1">RATE: ₹{eval12Rate} EACH</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.eval_phase2 && (
                    <div className="bg-neutral-surface/30 border border-black/5 rounded-md p-4 flex flex-col gap-4">
                      <div className="text-xs font-mono uppercase tracking-widest text-text-secondary">Phase 2 Details</div>
                      
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-brand-primary">01-07-2026</span>
                        <div className="grid grid-cols-2 gap-4">
                          <select name="eval2_1_appt" value={formData.eval2_1_appt} onChange={handleChange} className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm">
                            <option value="">Select Appointment</option>
                            <option value="Board Chairman/Chief Examiner">Board Chairman/Chief Examiner</option>
                            <option value="Examiner">Examiner</option>
                            <option value="Assistant Examiner">Assistant Examiner</option>
                          </select>
                          <div className="flex flex-col gap-1">
                            <input type="number" name="eval2_1_scripts" value={formData.eval2_1_scripts} onChange={handleChange} placeholder="Scripts" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm w-full" />
                            {eval21Rate > 0 && <span className="text-[10px] text-brand-primary/60 font-mono font-bold pl-1">RATE: ₹{eval21Rate} EACH</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Practical */}
            <div className="border border-black/5 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="practical_enabled" checked={formData.practical_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                  <Microscope size={16} className="text-pink-500" />
                  <span className="font-semibold text-brand-primary">Practical</span>
                </div>
                {formData.practical_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.practical)}</span>}
              </div>
              {formData.practical_enabled && (
                <div className="mt-4 grid grid-cols-2 gap-4 pl-7">
                  <select name="practical_type" value={formData.practical_type} onChange={handleChange} className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm">
                    <option value="">Select Type</option>
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                    <option value="Ph.D">Ph.D</option>
                  </select>
                  <div className="flex flex-col gap-1">
                    <input type="number" name="practical_candidates" value={formData.practical_candidates} onChange={handleChange} placeholder="Number of Candidates" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm w-full" />
                    {practicalRate > 0 && <span className="text-[10px] text-brand-primary/60 font-mono font-bold pl-1">RATE: ₹{practicalRate} EACH</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Project */}
            <div className="border border-black/5 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="project_enabled" checked={formData.project_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                  <Presentation size={16} className="text-orange-500" />
                  <span className="font-semibold text-brand-primary">Project Viva Voce</span>
                </div>
                {formData.project_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.project)}</span>}
              </div>
              {formData.project_enabled && (
                <div className="mt-4 grid grid-cols-2 gap-4 pl-7">
                  <select name="project_course" value={formData.project_course} onChange={handleChange} className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm">
                    <option value="">Select Course</option>
                    <option value="M.E">M.E</option>
                    <option value="MBA">MBA</option>
                    <option value="B.E/B.Tech">B.E/B.Tech</option>
                  </select>
                  <div className="flex flex-col gap-1">
                    <input type="number" name="project_candidates" value={formData.project_candidates} onChange={handleChange} placeholder="Number of Candidates" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm w-full" />
                    {projectRate > 0 && <span className="text-[10px] text-brand-primary/60 font-mono font-bold pl-1">RATE: ₹{projectRate} EACH</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Squad Duty */}
            <div className="border border-black/5 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="squad_enabled" checked={formData.squad_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                  <ShieldAlert size={16} className="text-red-500" />
                  <span className="font-semibold text-brand-primary">Squad Duty</span>
                </div>
                {formData.squad_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.squad)}</span>}
              </div>
              {formData.squad_enabled && (
                <div className="mt-4 pl-7 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <span className="text-sm text-brand-primary font-semibold">Forenoon (₹200)</span>
                    <input type="number" name="squad_forenoon" value={formData.squad_forenoon} onChange={handleChange} placeholder="Days" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <span className="text-sm text-brand-primary font-semibold">Afternoon (₹200)</span>
                    <input type="number" name="squad_afternoon" value={formData.squad_afternoon} onChange={handleChange} placeholder="Days" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <span className="text-sm text-brand-primary font-semibold">Both Sessions (₹400)</span>
                    <input type="number" name="squad_both" value={formData.squad_both} onChange={handleChange} placeholder="Days" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Total & Submit */}
        <div className="bg-brand-primary rounded-md shadow-mega p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-white">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 block mb-1">Estimated Total</span>
            <div className="text-5xl font-primary font-bold text-white">
              {formatCurrency(grandTotal)}
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full md:w-auto ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-accent hover:bg-white hover:text-brand-primary'} text-white px-10 py-5 rounded-full font-mono text-sm uppercase tracking-widest font-bold shadow-accent transition-all flex items-center justify-center gap-3`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Claim'} {!isSubmitting && <ChevronRight size={18} />}
          </button>
        </div>

      </form>
    </div>
  );
}
