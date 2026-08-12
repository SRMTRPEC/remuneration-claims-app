import { useState, useEffect } from 'react';
import { Calculator, ShieldCheck, ChevronRight, FileText } from 'lucide-react';

export default function ClaimEditForm({ claim, onCancel, onSuccess }) {
  const isExt = !String(claim.staff_id).toUpperCase().startsWith('TRPT');

  const isCustomDesignation = !['Assistant Professor', 'Associate Professor', 'Professor'].includes(claim.designation);

  let parsedEval = [];
  try { parsedEval = JSON.parse(claim.eval_phase || '[]'); } catch (e) {}
  
  const p1_1 = parsedEval.find(s => s.phase === 'Phase 1' && s.date === '20-06-2026') || {};
  const p1_2 = parsedEval.find(s => s.phase === 'Phase 1' && s.date === '21-06-2026') || {};
  const p2_1 = parsedEval.find(s => s.phase === 'Phase 2' && s.date === '01-07-2026') || {};
  const hasPhase1 = !!(p1_1.appointment || p1_1.scripts || p1_2.appointment || p1_2.scripts);
  const hasPhase2 = !!(p2_1.appointment || p2_1.scripts);

  let parsedSquad = {};
  try { parsedSquad = JSON.parse(claim.squad_session || '{}'); } catch (e) {}

  const [formData, setFormData] = useState({
    staff_name: claim.staff_name || '',
    staff_id: claim.staff_id || '',
    department: claim.department || '',
    designation: isCustomDesignation ? 'Others' : (claim.designation || ''),
    other_designation: isCustomDesignation ? claim.designation : '',
    bank_name: claim.bank_name || '',
    bank_branch: claim.bank_branch || '',
    account_number: claim.account_number || '',
    ifsc_code: claim.ifsc_code || '',
    mobile_number: claim.mobile_number || '',
    
    qp_enabled: !!claim.qp_section_enabled,
    qp_type: claim.qp_type || '',
    qp_quantity: claim.qp_quantity || 0,
    
    scrutiny_enabled: !!(claim.scrutiny_quantity > 0),
    scrutiny_quantity: claim.scrutiny_quantity || 0,
    
    eval_enabled: !!(claim.eval_scripts > 0),
    eval_phase1: hasPhase1,
    eval_phase2: hasPhase2,
    eval1_1_appt: p1_1.appointment || '',
    eval1_1_scripts: p1_1.scripts || 0,
    eval1_2_appt: p1_2.appointment || '',
    eval1_2_scripts: p1_2.scripts || 0,
    eval2_1_appt: p2_1.appointment || '',
    eval2_1_scripts: p2_1.scripts || 0,

    practical_enabled: !!claim.practical_enabled,
    practical_type: claim.practical_type || '',
    practical_candidates: claim.practical_candidates || 0,
    
    project_enabled: !!claim.project_enabled,
    project_course: claim.project_course || '',
    project_candidates: claim.project_candidates || 0,
    
    practical_squad_enabled: !!claim.practical_squad_enabled,
    practical_squad_sessions: claim.practical_squad_sessions || 0,
    
    squad_enabled: !!(claim.squad_days > 0),
    squad_forenoon: parsedSquad.Forenoon || 0,
    squad_afternoon: parsedSquad.Afternoon || 0,
    squad_both: parsedSquad['Both Sessions'] || 0,
  });

  const [amounts, setAmounts] = useState({ qp: 0, scrutiny: 0, eval: 0, squad: 0, practical: 0, project: 0, practical_squad: 0 });
  const [grandTotal, setGrandTotal] = useState(claim.grand_total || 0);
  const [loading, setLoading] = useState(false);

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
  }, [formData, isExt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        qp_section_enabled: formData.qp_enabled,
        staff_section_enabled: true,
        designation: formData.designation === 'Others' ? formData.other_designation : formData.designation,
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
      };
      
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Update failed'}`);
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Profile Section */}
      <div className="bg-white rounded-md shadow-mega border border-black/5 p-8">
        <h2 className="font-primary text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
          <ShieldCheck className="text-brand-accent" size={20} /> Personal Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Full Name *</label>
            <input type="text" name="staff_name" value={formData.staff_name} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Staff ID / Univ No *</label>
            <input type="text" name="staff_id" value={formData.staff_id} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Department *</label>
            <select name="department" value={formData.department} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors">
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
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Designation *</label>
            <select name="designation" value={formData.designation} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors">
              <option value="">Select Designation</option>
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Professor">Professor</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.designation === 'Others' && (
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Please specify your Designation *</label>
              <input type="text" name="other_designation" value={formData.other_designation} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
            </div>
          )}
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
            <select name="bank_name" value={formData.bank_name} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors">
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
            <input type="text" name="bank_branch" value={formData.bank_branch} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Account Number *</label>
            <input type="text" name="account_number" value={formData.account_number} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">IFSC Code *</label>
            <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Mobile Number *</label>
            <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleChange} required className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Update Passbook Photo / PDF (Optional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full bg-neutral-surface border border-black/5 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-accent/10 file:text-brand-primary hover:file:bg-brand-accent/20 cursor-pointer" />
            {claim.passbook_file && <span className="text-xs text-text-secondary">Current file is attached. Only upload if you wish to change it.</span>}
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
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Papers</label>
                  <input type="number" name="qp_quantity" value={formData.qp_quantity} onChange={handleChange} placeholder="Quantity" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Scrutiny */}
          <div className="border border-black/5 rounded-md p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <input type="checkbox" name="scrutiny_enabled" checked={formData.scrutiny_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                <span className="font-semibold text-brand-primary">Paper Scrutiny</span>
              </div>
              {formData.scrutiny_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.scrutiny)}</span>}
            </div>
            {formData.scrutiny_enabled && (
              <div className="mt-4 pl-7 flex flex-col gap-1 w-1/2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Papers</label>
                <input type="number" name="scrutiny_quantity" value={formData.scrutiny_quantity} onChange={handleChange} placeholder="Quantity (₹300 each)" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
              </div>
            )}
          </div>

          {/* Eval */}
          <div className="border border-black/5 rounded-md p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <input type="checkbox" name="eval_enabled" checked={formData.eval_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
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
                          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Scripts</label>
                          <input type="number" name="eval1_1_scripts" value={formData.eval1_1_scripts} onChange={handleChange} placeholder="Scripts" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
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
                          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Scripts</label>
                          <input type="number" name="eval1_2_scripts" value={formData.eval1_2_scripts} onChange={handleChange} placeholder="Scripts" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
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
                          <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Scripts</label>
                          <input type="number" name="eval2_1_scripts" value={formData.eval2_1_scripts} onChange={handleChange} placeholder="Scripts" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
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
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Candidates</label>
                  <input type="number" name="practical_candidates" value={formData.practical_candidates} onChange={handleChange} placeholder="Number of Candidates" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Project */}
          <div className="border border-black/5 rounded-md p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <input type="checkbox" name="project_enabled" checked={formData.project_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
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
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Candidates</label>
                  <input type="number" name="project_candidates" value={formData.project_candidates} onChange={handleChange} placeholder="Number of Candidates" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Squad Duty */}
          <div className="border border-black/5 rounded-md p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <input type="checkbox" name="squad_enabled" checked={formData.squad_enabled} onChange={handleChange} className="w-4 h-4 accent-green-500 border border-black/20 rounded-sm cursor-pointer" />
                <span className="font-semibold text-brand-primary">Squad Duty</span>
              </div>
              {formData.squad_enabled && <span className="font-mono text-sm font-bold text-brand-accent">{formatCurrency(amounts.squad)}</span>}
            </div>
            {formData.squad_enabled && (
              <div className="mt-4 pl-7 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4 items-end">
                  <span className="text-sm text-brand-primary font-semibold mb-2">Forenoon (₹200)</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Days</label>
                    <input type="number" name="squad_forenoon" value={formData.squad_forenoon} onChange={handleChange} placeholder="Days" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <span className="text-sm text-brand-primary font-semibold mb-2">Afternoon (₹200)</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Days</label>
                    <input type="number" name="squad_afternoon" value={formData.squad_afternoon} onChange={handleChange} placeholder="Days" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <span className="text-sm text-brand-primary font-semibold mb-2">Both Sessions (₹400)</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Number of Days</label>
                    <input type="number" name="squad_both" value={formData.squad_both} onChange={handleChange} placeholder="Days" className="bg-neutral-surface border border-black/5 rounded-md px-4 py-2 text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 items-center">
        <button type="button" onClick={onCancel} className="bg-neutral-surface border border-black/5 text-brand-primary px-8 py-4 rounded-full font-mono text-sm uppercase tracking-widest hover:bg-white shadow-sm transition-all">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="bg-brand-accent hover:bg-brand-primary text-white px-8 py-4 rounded-full font-mono text-sm uppercase tracking-widest font-bold shadow-accent transition-all flex items-center justify-center gap-3 disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Changes'} <ChevronRight size={18} />
        </button>
      </div>
    </form>
  );
}
