/**
 * Claim Form Logic (app.js)
 * 
 * Handles form interactions, calculations, auto-save drafts,
 * form submission, validation, and print functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Auth check
  apiFetch('/api/auth/me').then(res => res.json()).then(data => {
    if (data.error) {
      window.location.href = '/login';
    } else {
      document.getElementById('staffWelcomeName').textContent = `Welcome, ${data.user.staff_name || data.user.fullName}`;
      
      // Auto-fill staff details if staff
      if (data.role === 'staff') {
        const staffNameInput = document.getElementById('staffName');
        const staffIdInput = document.getElementById('staffId');
        const departmentInput = document.getElementById('department');
        
        if (staffNameInput) staffNameInput.value = data.user.staff_name;
        if (staffIdInput) staffIdInput.value = data.user.staff_id.replace(/^TRPT/i, '');
        if (departmentInput) departmentInput.value = data.user.department;
      }
    }
  }).catch(() => {
    window.location.href = '/login';
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      sessionStorage.setItem('logged_out', 'true');
      window.location.href = '/login';
    });
  }

  // ── Element References ──────────────────────────────────────────
  const form = document.getElementById('claimForm');
  const saveBtn = document.getElementById('submitBtn');
  const resetBtn = document.getElementById('resetBtn');
  const printSuccessBtn = document.getElementById('printSuccessBtn');
  let submittedClaim = null;


  // QP section
  const qpEnabled = document.getElementById('qpEnabled');
  const qpSection = document.getElementById('qpSection');
  const qpBody = document.getElementById('qpBody');
  const qpRadios = document.querySelectorAll('input[name="qp_type"]');
  const qpQuantity = document.getElementById('qpQuantity');
  const qpRateDisplay = document.getElementById('qpRateDisplay');
  const qpSubtotal = document.getElementById('qpSubtotal');

  // Scrutiny section
  const scrutinyEnabled = document.getElementById('scrutinyEnabled');
  const scrutinySection = document.getElementById('scrutinySection');
  const scrutinyQuantity = document.getElementById('scrutinyQuantity');
  const scrutinySubtotal = document.getElementById('scrutinySubtotal');

  // Eval section
  const evalEnabled = document.getElementById('evalEnabled');
  const evalSection = document.getElementById('evalSection');
  const evalAppointment = document.getElementById('evalAppointment'); // Old (keeping if needed elsewhere? No, remove)
  
  const evalPhase1Toggle = document.getElementById('evalPhase1Toggle');
  const evalPhase1Block = document.getElementById('evalPhase1Block');
  const evalAppt1 = document.getElementById('evalAppt1');
  const evalDate1 = document.getElementById('evalDate1');
  const evalScripts1 = document.getElementById('evalScripts1');

  const evalPhase2Toggle = document.getElementById('evalPhase2Toggle');
  const evalPhase2Block = document.getElementById('evalPhase2Block');
  const evalAppt2 = document.getElementById('evalAppt2');
  const evalDate2 = document.getElementById('evalDate2');
  const evalScripts2 = document.getElementById('evalScripts2');
  const evalSubtotal = document.getElementById('evalSubtotal');

  // Squad section
  const squadEnabled = document.getElementById('squadEnabled');
  const squadSection = document.getElementById('squadSection');
  const squadForenoon = document.getElementById('squadForenoon');
  const squadAfternoon = document.getElementById('squadAfternoon');
  const squadBoth = document.getElementById('squadBoth');
  const squadSubtotal = document.getElementById('squadSubtotal');

  // Grand total
  const grandTotalAmount = document.getElementById('grandTotalAmount');
  const grandTotalWords = document.getElementById('grandTotalWords');
  const breakdownList = document.getElementById('breakdownList');

  // Draft
  const draftIndicator = document.getElementById('draftIndicator');
  let autoSaveTimer = null;
  let isSubmitting = false;



  qpEnabled.addEventListener('change', () => {
    if (qpEnabled.checked) {
      qpSection.style.display = 'block';
    } else {
      qpSection.style.display = 'none';
      // Reset QP values
      qpRadios.forEach(r => r.checked = false);
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      qpQuantity.value = '0';
      qpRateDisplay.textContent = '₹0';
    }
    recalculate();
  });

  scrutinyEnabled.addEventListener('change', () => {
    if (scrutinyEnabled.checked) {
      scrutinySection.style.display = 'block';
    } else {
      scrutinySection.style.display = 'none';
      scrutinyQuantity.value = '0';
    }
    recalculate();
  });

  evalEnabled.addEventListener('change', () => {
    if (evalEnabled.checked) {
      evalSection.style.display = 'block';
    } else {
      evalSection.style.display = 'none';
      evalAppointment.value = '';
      evalPhase.value = '';
      evalDate.innerHTML = '<option value="">Select Phase first</option>';
      evalDate.disabled = true;
      evalScripts.value = '0';
    }
    recalculate();
  });

  squadEnabled.addEventListener('change', () => {
    if (squadEnabled.checked) {
      squadSection.style.display = 'block';
    } else {
      squadSection.style.display = 'none';
      squadForenoon.value = '0';
      squadAfternoon.value = '0';
      squadBoth.value = '0';
      document.getElementById('squadForenoonAmount').textContent = '₹0';
      document.getElementById('squadAfternoonAmount').textContent = '₹0';
      document.getElementById('squadBothAmount').textContent = '₹0';
    }
    recalculate();
  });

  // ── QP Radio Selection ──────────────────────────────────────────

  let currentPassbookBase64 = null;
  const passbookFileInput = document.getElementById('passbookFile');
  passbookFileInput.addEventListener('change', async (e) => {
    let file = e.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        if (file.size > 2 * 1024 * 1024) {
          alert('PDF files must be smaller than 2MB. Please compress your PDF and try again.');
          passbookFileInput.value = '';
          currentPassbookBase64 = null;
          return;
        }
      } else if (file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          file = await imageCompression(file, options);
        } catch (error) {
          console.error('Image compression error:', error);
        }
      }
      
      const reader = new FileReader();
      reader.onload = (evt) => currentPassbookBase64 = evt.target.result;
      reader.readAsDataURL(file);
    } else {
      currentPassbookBase64 = null;
    }
  });

  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      radio.checked = true;

      // Update rate display
      const rate = radio.value === 'qp_with_answer_key' ? 1500 : 750;
      qpRateDisplay.textContent = formatCurrency(rate);
      recalculate();
    });
  });

  qpQuantity.addEventListener('change', recalculate);

  // ── Scrutiny ────────────────────────────────────────────────────
  scrutinyQuantity.addEventListener('change', recalculate);

  // ── Script Evaluation ───────────────────────────────────────────

  evalPhase1Toggle.addEventListener('change', () => {
    evalPhase1Block.style.display = evalPhase1Toggle.checked ? 'block' : 'none';
    recalculate();
  });

  evalPhase2Toggle.addEventListener('change', () => {
    evalPhase2Block.style.display = evalPhase2Toggle.checked ? 'block' : 'none';
    recalculate();
  });

  [
    document.getElementById('evalScripts1_1'), document.getElementById('evalScripts1_2'), document.getElementById('evalScripts2_1'),
    document.getElementById('evalAppt1_1'), document.getElementById('evalAppt1_2'), document.getElementById('evalAppt2_1')
  ].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input.type === 'number' && parseInt(input.value) < 0) input.value = 0;
      recalculate();
    });
  });

  // ── Squad Duty ──────────────────────────────────────────────────

  [squadForenoon, squadAfternoon, squadBoth].forEach(input => {
    input.addEventListener('input', () => {
      if (parseInt(input.value) < 0) input.value = 0;
      recalculate();
    });
  });

  // ── Recalculate All ─────────────────────────────────────────────

  function recalculate() {
    // QP Amount
    let qpAmount = 0;
    if (qpEnabled.checked) {
      const selectedQp = document.querySelector('input[name="qp_type"]:checked');
      if (selectedQp) {
        const rate = selectedQp.value === 'qp_with_answer_key' ? 1500 : 750;
        qpAmount = parseInt(qpQuantity.value || 0) * rate;
      }
    }
    qpSubtotal.textContent = formatCurrency(qpAmount);

    // Scrutiny Amount
    const scrutinyAmount = scrutinyEnabled.checked ? parseInt(scrutinyQuantity.value || 0) * 300 : 0;
    scrutinySubtotal.textContent = formatCurrency(scrutinyAmount);

    // Eval Amount
    let evalAmount = 0;
    if (evalEnabled.checked) {
      if (evalPhase1Toggle.checked) {
        const s1_1 = Math.max(0, parseInt(document.getElementById('evalScripts1_1').value || 0));
        const r1_1 = document.getElementById('evalAppt1_1').value === 'Chief Examiner/Controller' ? 33 : 30;
        evalAmount += s1_1 * r1_1;
        
        const s1_2 = Math.max(0, parseInt(document.getElementById('evalScripts1_2').value || 0));
        const r1_2 = document.getElementById('evalAppt1_2').value === 'Chief Examiner/Controller' ? 33 : 30;
        evalAmount += s1_2 * r1_2;
      }
      if (evalPhase2Toggle.checked) {
        const s2_1 = Math.max(0, parseInt(document.getElementById('evalScripts2_1').value || 0));
        const r2_1 = document.getElementById('evalAppt2_1').value === 'Chief Examiner/Controller' ? 33 : 30;
        evalAmount += s2_1 * r2_1;
      }
    }
    evalSubtotal.textContent = formatCurrency(evalAmount);

    // Squad Amount
    let squadAmount = 0;
    if (squadEnabled.checked) {
      const fDays = parseInt(squadForenoon.value) || 0;
      const aDays = parseInt(squadAfternoon.value) || 0;
      const bDays = parseInt(squadBoth.value) || 0;
      
      const fAmount = fDays * 200;
      const aAmount = aDays * 200;
      const bAmount = bDays * 400;
      
      document.getElementById('squadForenoonAmount').textContent = formatCurrency(fAmount);
      document.getElementById('squadAfternoonAmount').textContent = formatCurrency(aAmount);
      document.getElementById('squadBothAmount').textContent = formatCurrency(bAmount);
      
      squadAmount = fAmount + aAmount + bAmount;
    }
    squadSubtotal.textContent = formatCurrency(squadAmount);

    // Grand Total
    const total = qpAmount + scrutinyAmount + evalAmount + squadAmount;
    grandTotalAmount.textContent = formatCurrency(total);
    grandTotalWords.textContent = numberToWords(total);

    // Breakdown items
    const breakdowns = [];
    if (qpAmount > 0) breakdowns.push({ label: 'QP Setting', value: formatCurrency(qpAmount) });
    if (scrutinyAmount > 0) breakdowns.push({ label: 'Scrutiny', value: formatCurrency(scrutinyAmount) });
    if (evalAmount > 0) breakdowns.push({ label: 'Evaluation', value: formatCurrency(evalAmount) });
    if (squadAmount > 0) breakdowns.push({ label: 'Squad Duty', value: formatCurrency(squadAmount) });

    breakdownList.innerHTML = breakdowns.map(b =>
      `<div class="breakdown-item"><span class="label">${b.label}:</span><span class="value">${b.value}</span></div>`
    ).join('');

    // Trigger auto-save
    scheduleAutoSave();
  }

  // ── Form Submission ─────────────────────────────────────────────

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate
    if (!validateForm()) return;

    isSubmitting = true;
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;

    try {
      const selectedQp = document.querySelector('input[name="qp_type"]:checked');

      const payload = {
        staff_name: document.getElementById('staffName').value.trim(),
        staff_id: 'TRPT' + document.getElementById('staffId').value.trim().replace(/^TRPT/i, ''),
        department: document.getElementById('department').value.trim(),
        designation: document.getElementById('designation').value,
        bank_name: document.getElementById('bankName').value.trim(),
        bank_branch: document.getElementById('bankBranch').value.trim(),
        account_number: document.getElementById('accountNumber').value.trim(),
        ifsc_code: document.getElementById('ifscCode').value.trim(),
        mobile_number: document.getElementById('mobileNumber').value.trim(),
        passbook_file: currentPassbookBase64,
        staff_section_enabled: true,
        qp_section_enabled: qpEnabled.checked,
        qp_type: selectedQp ? selectedQp.value : null,
        qp_quantity: parseInt(qpQuantity.value) || 0,
        scrutiny_quantity: parseInt(scrutinyQuantity.value) || 0,
        eval_sessions: (() => {
          let sessions = [];
          if (evalPhase1Toggle.checked) {
            const a1 = document.getElementById('evalAppt1_1').value;
            const s1 = parseInt(document.getElementById('evalScripts1_1').value) || 0;
            if (a1 || s1 > 0) sessions.push({ phase: 'Phase 1', appointment: a1 || null, date: '20-06-2026', scripts: s1 });
            
            const a2 = document.getElementById('evalAppt1_2').value;
            const s2 = parseInt(document.getElementById('evalScripts1_2').value) || 0;
            if (a2 || s2 > 0) sessions.push({ phase: 'Phase 1', appointment: a2 || null, date: '21-06-2026', scripts: s2 });
          }
          if (evalPhase2Toggle.checked) {
            const a3 = document.getElementById('evalAppt2_1').value;
            const s3 = parseInt(document.getElementById('evalScripts2_1').value) || 0;
            if (a3 || s3 > 0) sessions.push({ phase: 'Phase 2', appointment: a3 || null, date: '01-07-2026', scripts: s3 });
          }
          return sessions;
        })(),
        squad_sessions: {
          Forenoon: parseInt(squadForenoon.value) || 0,
          Afternoon: parseInt(squadAfternoon.value) || 0,
          "Both Sessions": parseInt(squadBoth.value) || 0
        },
      };

      const res = await apiFetch('/api/claims', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.details ? data.details.join(', ') : data.error;
        showToast(msg, 'error');
        return;
      }

      // Success!
      submittedClaim = data.claim;
      showSuccessModal(data.claim);

      // Delete draft
      const sessionId = getSessionId();
      await apiFetch(`/api/claims/draft/${sessionId}`, { method: 'DELETE' });
      sessionStorage.removeItem('claim_session_id');

      // Reset form
      form.reset();
      qpSection.classList.add('disabled');
      scrutinySection.classList.add('disabled');
      evalSection.classList.add('disabled');
      squadSection.classList.add('disabled');
      
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      qpRateDisplay.textContent = '₹0';
      squadSubtotal.textContent = '₹0';
      document.getElementById('squadForenoonAmount').textContent = '₹0';
      document.getElementById('squadAfternoonAmount').textContent = '₹0';
      document.getElementById('squadBothAmount').textContent = '₹0';
      recalculate();

    } catch (err) {
      console.error('Submit error:', err);
      showToast('Failed to submit claim. Please try again.', 'error');
    } finally {
      isSubmitting = false;
      saveBtn.classList.remove('loading');
      saveBtn.disabled = false;
    }
  });

  // ── Form Validation ─────────────────────────────────────────────

  function validateForm() {
    const errors = [];

    if (staffEnabled.checked) {
      if (!document.getElementById('staffName').value.trim()) errors.push('Staff Name is required');
      if (!document.getElementById('staffId').value.trim()) errors.push('Staff ID is required');
      if (!document.getElementById('department').value.trim()) errors.push('Department is required');
      if (!document.getElementById('designation').value) errors.push('Designation is required');
      if (!document.getElementById('bankName').value.trim()) errors.push('Bank Name is required');
      if (!document.getElementById('bankBranch').value.trim()) errors.push('Bank Branch is required');
      if (!document.getElementById('accountNumber').value.trim()) errors.push('Account Number is required');
      if (!document.getElementById('ifscCode').value.trim()) errors.push('IFSC Code is required');
      if (!document.getElementById('mobileNumber').value.trim()) errors.push('Mobile Number is required');
    }

    if (errors.length > 0) {
      errors.forEach(err => showToast(err, 'error'));
      return false;
    }
    return true;
  }

  // ── Success Modal ───────────────────────────────────────────────

  function showSuccessModal(claim) {
    document.getElementById('successClaimNumber').textContent = claim.claim_number;
    document.getElementById('successGrandTotal').textContent = formatCurrency(claim.grand_total);
    document.getElementById('successAmountWords').textContent = claim.amount_in_words;
    const modal = document.getElementById('successModal');
    modal.classList.add('active');
  }

  // ── Reset Button ────────────────────────────────────────────────

  resetBtn.addEventListener('click', () => {
    showConfirmDialog(
      'Reset Form',
      'Are you sure you want to reset all fields? This cannot be undone.',
      () => {
        form.reset();
        qpSection.classList.add('disabled');
        scrutinySection.classList.add('disabled');
        evalSection.classList.add('disabled');
        squadSection.classList.add('disabled');
        
        qpEnabled.checked = false;
        scrutinyEnabled.checked = false;
        evalEnabled.checked = false;
        squadEnabled.checked = false;
        
        staffEnabled.checked = true;
        staffBody.style.opacity = '1';
        document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
        qpRateDisplay.textContent = '₹0';
        squadRateDisplay.textContent = '₹0';
        recalculate();
        showToast('Form has been reset', 'info');
      }
    );
  });

  // ── Print Success Button ────────────────────────────────────────

  if (printSuccessBtn) {
    printSuccessBtn.addEventListener('click', () => {
      if (submittedClaim) {
        printSubmittedClaim(submittedClaim);
      }
    });
  }

  // ── Auto-Save Draft ─────────────────────────────────────────────

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveDraft, 30000); // 30 seconds
  }

  async function saveDraft() {
    const formData = getFormData();
    const sessionId = getSessionId();

    try {
      draftIndicator.classList.add('visible', 'saving');
      draftIndicator.querySelector('.draft-text').textContent = 'Saving draft...';

      await apiFetch('/api/claims/draft', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, form_data: formData }),
      });

      draftIndicator.classList.remove('saving');
      draftIndicator.classList.add('saved');
      draftIndicator.querySelector('.draft-text').textContent = 'Draft saved';

      setTimeout(() => draftIndicator.classList.remove('visible'), 3000);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }

  async function loadDraft() {
    const sessionId = getSessionId();
    try {
      const res = await apiFetch(`/api/claims/draft/${sessionId}`);
      const data = await res.json();

      if (data.draft && data.draft.form_data) {
        restoreFormData(data.draft.form_data);
        showToast('Draft restored from your previous session', 'info', 'Draft Loaded');
      }
    } catch (err) {
      // Silent fail — no draft to load
    }
  }

  function getFormData() {
    const selectedQp = document.querySelector('input[name="qp_type"]:checked');
    return {
      staff_name: document.getElementById('staffName').value,
      staff_id: document.getElementById('staffId').value,
      department: document.getElementById('department').value,
      designation: document.getElementById('designation').value,
      bank_name: document.getElementById('bankName').value,
      bank_branch: document.getElementById('bankBranch').value,
      account_number: document.getElementById('accountNumber').value,
      ifsc_code: document.getElementById('ifscCode').value,
      mobile_number: document.getElementById('mobileNumber').value,
      
      staff_enabled: staffEnabled.checked,
      qp_enabled: qpEnabled.checked,
      qp_type: selectedQp ? selectedQp.value : null,
      qp_quantity: qpQuantity.value,
      
      scrutiny_enabled: scrutinyEnabled.checked,
      scrutiny_quantity: scrutinyQuantity.value,
      
      eval_enabled: evalEnabled.checked,
      eval_phase1: evalPhase1Toggle.checked,
      eval_appt1_1: document.getElementById('evalAppt1_1').value,
      eval_scripts1_1: document.getElementById('evalScripts1_1').value,
      eval_appt1_2: document.getElementById('evalAppt1_2').value,
      eval_scripts1_2: document.getElementById('evalScripts1_2').value,
      eval_phase2: evalPhase2Toggle.checked,
      eval_appt2_1: document.getElementById('evalAppt2_1').value,
      eval_scripts2_1: document.getElementById('evalScripts2_1').value,
      
      squad_enabled: squadEnabled.checked,
      squad_sessions: {
        Forenoon: squadForenoon.value,
        Afternoon: squadAfternoon.value,
        "Both Sessions": squadBoth.value
      },
    };
  }

  function restoreFormData(data) {
    if (data.staff_name) document.getElementById('staffName').value = data.staff_name;
    if (data.staff_id) document.getElementById('staffId').value = data.staff_id.replace(/^TRPT/i, '');
    if (data.department) document.getElementById('department').value = data.department;
    if (data.designation) document.getElementById('designation').value = data.designation;
    if (data.bank_name) document.getElementById('bankName').value = data.bank_name;
    if (data.bank_branch) document.getElementById('bankBranch').value = data.bank_branch;
    if (data.account_number) document.getElementById('accountNumber').value = data.account_number;
    if (data.ifsc_code) document.getElementById('ifscCode').value = data.ifsc_code;
    if (data.mobile_number) document.getElementById('mobileNumber').value = data.mobile_number;

    if (data.staff_enabled !== undefined) {
      staffEnabled.checked = data.staff_enabled;
      staffEnabled.dispatchEvent(new Event('change'));
    }

    if (data.qp_enabled) {
      qpEnabled.checked = true;
      qpSection.classList.remove('disabled');
      if (data.qp_type) {
        const radio = document.querySelector(`input[name="qp_type"][value="${data.qp_type}"]`);
        if (radio) {
          radio.checked = true;
          radio.closest('.radio-card').classList.add('selected');
          const rate = data.qp_type === 'qp_with_answer_key' ? 1500 : 750;
          qpRateDisplay.textContent = formatCurrency(rate);
        }
      }
      if (data.qp_quantity) qpQuantity.value = data.qp_quantity;
    }

    if (data.scrutiny_enabled) {
      scrutinyEnabled.checked = true;
      scrutinySection.classList.remove('disabled');
      if (data.scrutiny_quantity) scrutinyQuantity.value = data.scrutiny_quantity;
    }
    
    if (data.eval_enabled) {
      evalEnabled.checked = true;
      evalSection.classList.remove('disabled');
      if (data.eval_phase1) {
        evalPhase1Toggle.checked = true;
        evalPhase1Toggle.dispatchEvent(new Event('change'));
        if (data.eval_appt1_1) document.getElementById('evalAppt1_1').value = data.eval_appt1_1;
        if (data.eval_scripts1_1) document.getElementById('evalScripts1_1').value = data.eval_scripts1_1;
        if (data.eval_appt1_2) document.getElementById('evalAppt1_2').value = data.eval_appt1_2;
        if (data.eval_scripts1_2) document.getElementById('evalScripts1_2').value = data.eval_scripts1_2;
      }
      if (data.eval_phase2) {
        evalPhase2Toggle.checked = true;
        evalPhase2Toggle.dispatchEvent(new Event('change'));
        if (data.eval_appt2_1) document.getElementById('evalAppt2_1').value = data.eval_appt2_1;
        if (data.eval_scripts2_1) document.getElementById('evalScripts2_1').value = data.eval_scripts2_1;
      }
    }
    
    if (data.squad_enabled) {
      squadEnabled.checked = true;
      squadSection.classList.remove('disabled');
      if (data.squad_sessions) {
        if (data.squad_sessions.Forenoon) squadForenoon.value = data.squad_sessions.Forenoon;
        if (data.squad_sessions.Afternoon) squadAfternoon.value = data.squad_sessions.Afternoon;
        if (data.squad_sessions["Both Sessions"]) squadBoth.value = data.squad_sessions["Both Sessions"];
      }
    }

    recalculate();
  }

  function printSubmittedClaim(claimData) {
    const printHtml = generatePrintHtml(claimData);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  // ── Initialize ──────────────────────────────────────────────────
  loadDraft();

  const submitAnotherBtn = document.getElementById('submitAnotherBtn');
  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('successModal').classList.remove('active');
      window.location.reload();
    });
  }
});

// ── Generate Print HTML ─────────────────────────────────────────────

function formatSquadSessionPrint(sessionStr) {
  if (!sessionStr) return '-';
  if (sessionStr.startsWith('{')) {
    try {
      const obj = JSON.parse(sessionStr);
      return Object.entries(obj).filter(([_, c]) => c > 0).map(([s, c]) => `${c}x ${s}`).join(', ') || '-';
    } catch(e) { return '-'; }
  }
  return escapeHtml(sessionStr);
}

function generatePrintHtml(claim) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Remuneration Claim - ${escapeHtml(claim.claim_number || 'DRAFT')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; padding: 15mm 20mm; color: #000; }
    @page { size: A4; margin: 15mm 20mm; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10pt; margin-bottom: 15pt; }
    .header h1 { font-size: 16pt; text-transform: uppercase; letter-spacing: 2pt; margin-bottom: 4pt; }
    .header h2 { font-size: 13pt; text-transform: uppercase; }
    .header .sub { font-size: 10pt; margin-top: 4pt; color: #444; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10pt; font-size: 10pt; }
    .info-item { }
    .info-label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 5pt 8pt; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 9pt; }
    .amount { text-align: right; font-weight: bold; }
    .section-row { background: #f8f8f8; font-weight: bold; }
    .grand-total { font-size: 12pt; font-weight: bold; border-top: 3px double #000; }
    .grand-total td { padding: 8pt; }
    .words { margin: 10pt 0; font-style: italic; font-size: 10pt; border: 1px solid #000; padding: 6pt 10pt; }
    .signatures { display: flex; justify-content: space-between; margin-top: 60pt; }
    .sig-block { text-align: center; width: 30%; }
    .sig-line { border-top: 1px solid #000; padding-top: 4pt; font-size: 10pt; font-weight: bold; }
    .sig-desc { font-size: 8pt; margin-top: 2pt; }
    .footer { text-align: center; font-size: 8pt; color: #666; margin-top: 30pt; border-top: 1px solid #ccc; padding-top: 4pt; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Remuneration Claim Form</h1>
    <h2>April - May Examination 2026</h2>
    <div class="sub">Claim No: ${escapeHtml(claim.claim_number || 'DRAFT')} | Date: ${formatDate(claim.created_at)}</div>
  </div>

  <div class="info-row">
    <div class="info-item"><span class="info-label">Staff Name:</span> ${escapeHtml(claim.staff_name || '-')}</div>
    <div class="info-item"><span class="info-label">Staff ID:</span> ${escapeHtml(claim.staff_id || '-')}</div>
  </div>
  <div class="info-row">
    <div class="info-item"><span class="info-label">Department:</span> ${escapeHtml(claim.department || '-')}</div>
    <div class="info-item"><span class="info-label">Designation:</span> ${escapeHtml(claim.designation || '-')}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Description</th>
        <th>Details</th>
        <th>Quantity</th>
        <th>Rate (₹)</th>
        <th style="text-align:right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${claim.qp_section_enabled ? `
      <tr>
        <td>1</td>
        <td>Question Paper Setting</td>
        <td>${qpTypeLabel(claim.qp_type)}</td>
        <td>${claim.qp_quantity || 0}</td>
        <td>${claim.qp_rate || 0}</td>
        <td class="amount">${Number(claim.qp_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr>
        <td>${claim.qp_section_enabled ? '2' : '1'}</td>
        <td>Paper Scrutiny</td>
        <td>-</td>
        <td>${claim.scrutiny_quantity || 0}</td>
        <td>300</td>
        <td class="amount">${Number(claim.scrutiny_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>${claim.qp_section_enabled ? '3' : '2'}</td>
        <td>Script Evaluation</td>
        <td>${escapeHtml(claim.eval_appointment || '-')} | ${escapeHtml(claim.eval_phase || '-')} | ${escapeHtml(claim.eval_date || '-')}</td>
        <td>${claim.eval_scripts || 0}</td>
        <td>30</td>
        <td class="amount">${Number(claim.eval_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>${claim.qp_section_enabled ? '4' : '3'}</td>
        <td>Squad Duty</td>
        <td>${formatSquadSessionPrint(claim.squad_session)}</td>
        <td>${claim.squad_days || 0} days</td>
        <td>-</td>
        <td class="amount">${Number(claim.squad_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr class="grand-total">
        <td colspan="5" style="text-align:right;font-weight:bold;">GRAND TOTAL</td>
        <td class="amount" style="font-size:13pt;">₹${Number(claim.grand_total || 0).toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="words">
    <strong>Amount in Words:</strong> ${escapeHtml(claim.amount_in_words || '')}
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Staff</div>
      <div class="sig-desc">Signature & Date</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">COE</div>
      <div class="sig-desc">Signature & Seal</div>
    </div>
  </div>

  <div class="footer">
    Generated by APRIL MAY Remuneration Claim System | ${new Date().toLocaleDateString('en-IN')}
  </div>
</body>
</html>`;
}
