/**
 * Claim Form Logic (app.js)
 * 
 * Handles form interactions, calculations, auto-save drafts,
 * form submission, validation, and print functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
  // For security: when exiting the admin panel to the main form, clear the admin session
  apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  sessionStorage.setItem('logged_out', 'true');

  // ── Element References ──────────────────────────────────────────
  const form = document.getElementById('claimForm');
  const saveBtn = document.getElementById('saveClaimBtn');
  const resetBtn = document.getElementById('resetBtn');
  const printBtn = document.getElementById('printBtn');

  // Staff section
  const staffEnabled = document.getElementById('staffEnabled');
  const staffBody = document.getElementById('staffBody');

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
  const evalAppointment = document.getElementById('evalAppointment');
  const evalPhase = document.getElementById('evalPhase');
  const evalDate = document.getElementById('evalDate');
  const evalScripts = document.getElementById('evalScripts');
  const evalSubtotal = document.getElementById('evalSubtotal');

  // Squad section
  const squadEnabled = document.getElementById('squadEnabled');
  const squadSection = document.getElementById('squadSection');
  const squadDays = document.getElementById('squadDays');
  const squadSession = document.getElementById('squadSession');
  const squadRateDisplay = document.getElementById('squadRateDisplay');
  const squadSubtotal = document.getElementById('squadSubtotal');

  // Grand total
  const grandTotalAmount = document.getElementById('grandTotalAmount');
  const grandTotalWords = document.getElementById('grandTotalWords');
  const breakdownList = document.getElementById('breakdownList');

  // Draft
  const draftIndicator = document.getElementById('draftIndicator');
  let autoSaveTimer = null;
  let isSubmitting = false;

  // ── Section Enable/Disable ──────────────────────────────────────

  staffEnabled.addEventListener('change', () => {
    const inputs = staffBody.querySelectorAll('input, select');
    inputs.forEach(input => input.disabled = !staffEnabled.checked);
    if (!staffEnabled.checked) {
      staffBody.style.opacity = '0.4';
    } else {
      staffBody.style.opacity = '1';
    }
  });

  qpEnabled.addEventListener('change', () => {
    if (qpEnabled.checked) {
      qpSection.classList.remove('disabled');
    } else {
      qpSection.classList.add('disabled');
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
      scrutinySection.classList.remove('disabled');
    } else {
      scrutinySection.classList.add('disabled');
      scrutinyQuantity.value = '0';
    }
    recalculate();
  });

  evalEnabled.addEventListener('change', () => {
    if (evalEnabled.checked) {
      evalSection.classList.remove('disabled');
    } else {
      evalSection.classList.add('disabled');
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
      squadSection.classList.remove('disabled');
    } else {
      squadSection.classList.add('disabled');
      squadDays.value = '0';
      squadSession.value = '';
      squadRateDisplay.textContent = '₹0';
    }
    recalculate();
  });

  // ── QP Radio Selection ──────────────────────────────────────────

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

  evalPhase.addEventListener('change', () => {
    evalDate.disabled = false;
    evalDate.innerHTML = '';

    if (evalPhase.value === 'Phase 1') {
      evalDate.innerHTML = `
        <option value="">Select Date</option>
        <option value="Both Days">Both Days (20-06 & 21-06)</option>
        <option value="20-06-2026">20-06-2026</option>
        <option value="21-06-2026">21-06-2026</option>
      `;
    } else if (evalPhase.value === 'Phase 2') {
      evalDate.innerHTML = `
        <option value="01-07-2026">01-07-2026</option>
      `;
    } else {
      evalDate.innerHTML = '<option value="">Select Phase first</option>';
      evalDate.disabled = true;
    }
  });

  evalScripts.addEventListener('input', () => {
    // Prevent negative
    if (parseInt(evalScripts.value) < 0) evalScripts.value = 0;
    recalculate();
  });

  // ── Squad Duty ──────────────────────────────────────────────────

  squadSession.addEventListener('change', () => {
    const rate = squadSession.value === 'Both Sessions' ? 400 : 
                 (squadSession.value === 'Forenoon' || squadSession.value === 'Afternoon') ? 200 : 0;
    squadRateDisplay.textContent = formatCurrency(rate);
    recalculate();
  });

  squadDays.addEventListener('change', recalculate);

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
    const evalAmount = evalEnabled.checked ? Math.max(0, parseInt(evalScripts.value || 0)) * 30 : 0;
    evalSubtotal.textContent = formatCurrency(evalAmount);

    // Squad Amount
    const sRate = squadSession.value === 'Both Sessions' ? 400 : 
                  (squadSession.value === 'Forenoon' || squadSession.value === 'Afternoon') ? 200 : 0;
    const squadAmount = squadEnabled.checked ? parseInt(squadDays.value || 0) * sRate : 0;
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
        staff_id: document.getElementById('staffId').value.trim(),
        department: document.getElementById('department').value.trim(),
        designation: document.getElementById('designation').value,
        staff_section_enabled: staffEnabled.checked,
        qp_section_enabled: qpEnabled.checked,
        qp_type: selectedQp ? selectedQp.value : null,
        qp_quantity: parseInt(qpQuantity.value) || 0,
        scrutiny_quantity: parseInt(scrutinyQuantity.value) || 0,
        eval_appointment: document.getElementById('evalAppointment').value || null,
        eval_phase: evalPhase.value || null,
        eval_date: evalDate.value || null,
        eval_scripts: parseInt(evalScripts.value) || 0,
        squad_days: parseInt(squadDays.value) || 0,
        squad_session: squadSession.value || null,
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
      squadRateDisplay.textContent = '₹0';
      evalDate.innerHTML = '<option value="">Select Phase first</option>';
      evalDate.disabled = true;
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
        evalDate.innerHTML = '<option value="">Select Phase first</option>';
        evalDate.disabled = true;
        recalculate();
        showToast('Form has been reset', 'info');
      }
    );
  });

  // ── Print Button ────────────────────────────────────────────────

  printBtn.addEventListener('click', () => {
    printCurrentForm();
  });

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
      staff_enabled: staffEnabled.checked,
      qp_enabled: qpEnabled.checked,
      qp_type: selectedQp ? selectedQp.value : null,
      qp_quantity: qpQuantity.value,
      
      scrutiny_enabled: scrutinyEnabled.checked,
      scrutiny_quantity: scrutinyQuantity.value,
      
      eval_enabled: evalEnabled.checked,
      eval_appointment: document.getElementById('evalAppointment').value,
      eval_phase: evalPhase.value,
      eval_date: evalDate.value,
      eval_scripts: evalScripts.value,
      
      squad_enabled: squadEnabled.checked,
      squad_days: squadDays.value,
      squad_session: squadSession.value,
    };
  }

  function restoreFormData(data) {
    if (data.staff_name) document.getElementById('staffName').value = data.staff_name;
    if (data.staff_id) document.getElementById('staffId').value = data.staff_id;
    if (data.department) document.getElementById('department').value = data.department;
    if (data.designation) document.getElementById('designation').value = data.designation;

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
      if (data.eval_appointment) document.getElementById('evalAppointment').value = data.eval_appointment;
      if (data.eval_phase) {
        evalPhase.value = data.eval_phase;
        evalPhase.dispatchEvent(new Event('change'));
        if (data.eval_date) {
          setTimeout(() => { evalDate.value = data.eval_date; }, 50);
        }
      }
      if (data.eval_scripts) evalScripts.value = data.eval_scripts;
    }
    
    if (data.squad_enabled) {
      squadEnabled.checked = true;
      squadSection.classList.remove('disabled');
      if (data.squad_days) squadDays.value = data.squad_days;
      if (data.squad_session) {
        squadSession.value = data.squad_session;
        const rate = data.squad_session === 'Both Sessions' ? 400 : 200;
        squadRateDisplay.textContent = formatCurrency(rate);
      }
    }

    recalculate();
  }

  // ── Print Current Form ──────────────────────────────────────────

  function printCurrentForm() {
    const data = getFormData();
    const selectedQp = document.querySelector('input[name="qp_type"]:checked');
    
    // Calculate amounts for print
    let qpAmount = 0, qpRate = 0;
    if (data.qp_enabled && selectedQp) {
      qpRate = selectedQp.value === 'qp_with_answer_key' ? 1500 : 750;
      qpAmount = parseInt(data.qp_quantity || 0) * qpRate;
    }
    const scrutinyAmount = parseInt(data.scrutiny_quantity || 0) * 300;
    const evalAmount = Math.max(0, parseInt(data.eval_scripts || 0)) * 30;
    const sRate = data.squad_session === 'Both Sessions' ? 400 : (data.squad_session === 'Forenoon' || data.squad_session === 'Afternoon') ? 200 : 0;
    const squadAmount = parseInt(data.squad_days || 0) * sRate;
    const total = qpAmount + scrutinyAmount + evalAmount + squadAmount;

    const printHtml = generatePrintHtml({
      ...data,
      qp_rate: qpRate,
      qp_amount: qpAmount,
      scrutiny_amount: scrutinyAmount,
      eval_amount: evalAmount,
      squad_rate: sRate,
      squad_amount: squadAmount,
      grand_total: total,
      amount_in_words: numberToWords(total),
      claim_number: 'DRAFT',
      created_at: new Date().toISOString(),
    });

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
      ${claim.qp_enabled ? `
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
        <td>${claim.qp_enabled ? '2' : '1'}</td>
        <td>Paper Scrutiny</td>
        <td>-</td>
        <td>${claim.scrutiny_quantity || 0}</td>
        <td>300</td>
        <td class="amount">${Number(claim.scrutiny_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>${claim.qp_enabled ? '3' : '2'}</td>
        <td>Script Evaluation</td>
        <td>${escapeHtml(claim.eval_appointment || '-')} | ${escapeHtml(claim.eval_phase || '-')} | ${escapeHtml(claim.eval_date || '-')}</td>
        <td>${claim.eval_scripts || 0}</td>
        <td>30</td>
        <td class="amount">${Number(claim.eval_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>${claim.qp_enabled ? '4' : '3'}</td>
        <td>Squad Duty</td>
        <td>${escapeHtml(claim.squad_session || '-')}</td>
        <td>${claim.squad_days || 0} days</td>
        <td>${claim.squad_rate || 0}</td>
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
      <div class="sig-line">Claimant</div>
      <div class="sig-desc">Signature & Date</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Head of Department</div>
      <div class="sig-desc">Signature & Seal</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Principal / Accounts</div>
      <div class="sig-desc">Signature & Seal</div>
    </div>
  </div>

  <div class="footer">
    Generated by APRIL MAY Remuneration Claim System | ${new Date().toLocaleDateString('en-IN')}
  </div>
</body>
</html>`;
}
