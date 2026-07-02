/**
 * Claim Detail Logic
 * 
 * View and edit a single claim. Handles mode switching,
 * form population, update submission, and printing.
 */

let currentClaim = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', () => {
  loadAdminInfo();
  const claimId = getClaimIdFromUrl();
  if (!claimId) {
    document.getElementById('claimContent').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Invalid claim ID</div></div>';
    return;
  }
  isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
  loadClaim(claimId);

  const backBtn = document.getElementById('backToClaimsBtn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/admin/claims';
    });
  }

  const claimContent = document.getElementById('claimContent');
  if (claimContent) {
    claimContent.addEventListener('click', (e) => {
      const btn = e.target.closest('.action-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'edit') {
        switchToEdit();
      } else if (action === 'print') {
        printCurrentClaim();
      } else if (action === 'delete') {
        deleteCurrentClaim();
      } else if (action === 'cancelEdit') {
        cancelEdit();
      } else if (action === 'saveEdit') {
        saveEdit();
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      sessionStorage.setItem('logged_out', 'true');
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      window.location.href = '/admin';
    });
  }
});

function getClaimIdFromUrl() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1];
}

async function loadAdminInfo() {
  try {
    const res = await apiFetch('/api/auth/me');
    if (res && res.ok) {
      const me = await res.json();
      document.getElementById('userName').textContent = me.fullName || me.username;
      document.getElementById('userAvatar').textContent = (me.fullName || me.username).charAt(0).toUpperCase();
    }
  } catch (e) {}
}

async function loadClaim(id) {
  try {
    const res = await apiFetch(`/api/claims/${id}`);
    if (!res || !res.ok) {
      document.getElementById('claimContent').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Claim not found</div></div>';
      return;
    }
    currentClaim = await res.json();
    document.getElementById('pageTitle').textContent = `Claim ${currentClaim.claim_number}`;

    if (isEditMode) {
      renderEditMode();
    } else {
      renderViewMode();
    }
  } catch (err) {
    console.error('Load claim error:', err);
    document.getElementById('claimContent').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Failed to load claim</div></div>';
  }
}

// ── View Mode ───────────────────────────────────────────────────────

function renderViewMode() {
  const c = currentClaim;
  const content = document.getElementById('claimContent');

  content.innerHTML = `
    <div class="claim-detail-header animate-fade-in">
      <div>
        <span class="badge badge-primary" style="font-size:0.85rem;padding:0.3rem 0.8rem;">${escapeHtml(c.claim_number)}</span>
        <span style="color:var(--text-muted);font-size:0.85rem;margin-left:var(--space-sm);">${formatDateTime(c.created_at)}</span>
        ${c.updated_at && c.updated_at !== c.created_at ? `<span style="color:var(--text-muted);font-size:0.78rem;margin-left:var(--space-sm);">(Updated: ${formatDateTime(c.updated_at)})</span>` : ''}
      </div>
      <div style="display:flex;gap:var(--space-sm);">
        <button class="btn btn-primary btn-sm action-btn" data-action="edit">✏️ Edit</button>
        <button class="btn btn-outline btn-sm action-btn" data-action="print">🖨️ Print</button>
        <button class="btn btn-danger btn-sm action-btn" data-action="delete" style="background:var(--danger-500);color:white;border:none;">🗑️ Delete</button>
      </div>
    </div>

    <!-- Staff Details -->
    <div class="card animate-fade-in" style="margin-bottom:var(--space-lg);">
      <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;gap:var(--space-sm);">
        <span style="font-size:1.2rem;">👤</span> Staff Details
      </h3>
      <div class="claim-detail-info">
        <div class="detail-field">
          <div class="detail-field-label">Staff Name</div>
          <div class="detail-field-value">${escapeHtml(c.staff_name)}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Staff ID</div>
          <div class="detail-field-value">${escapeHtml(c.staff_id)}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Department</div>
          <div class="detail-field-value">${escapeHtml(c.department)}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Designation</div>
          <div class="detail-field-value">${escapeHtml(c.designation)}</div>
        </div>
      </div>
    </div>

    <!-- Claim Breakdown -->
    <div class="card animate-fade-in" style="margin-bottom:var(--space-lg);">
      <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;gap:var(--space-sm);">
        <span style="font-size:1.2rem;">📋</span> Claim Breakdown
      </h3>
      <table class="data-table" style="margin:0;">
        <thead>
          <tr>
            <th>Component</th>
            <th>Details</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${c.qp_section_enabled ? `
          <tr>
            <td style="font-weight:600;">Question Paper Setting</td>
            <td>${qpTypeLabel(c.qp_type)}</td>
            <td>${c.qp_quantity || 0}</td>
            <td>${formatCurrency(c.qp_rate || 0)}</td>
            <td style="text-align:right;font-weight:700;color:var(--primary-600);">${formatCurrency(c.qp_amount || 0)}</td>
          </tr>` : ''}
          <tr>
            <td style="font-weight:600;">Paper Scrutiny</td>
            <td>—</td>
            <td>${c.scrutiny_quantity || 0}</td>
            <td>₹300</td>
            <td style="text-align:right;font-weight:700;color:var(--primary-600);">${formatCurrency(c.scrutiny_amount || 0)}</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Script Evaluation</td>
            <td>${escapeHtml(c.eval_appointment || '-')} | ${escapeHtml(c.eval_phase || '-')} | ${escapeHtml(c.eval_date || '-')}</td>
            <td>${c.eval_scripts || 0} scripts</td>
            <td>₹30</td>
            <td style="text-align:right;font-weight:700;color:var(--primary-600);">${formatCurrency(c.eval_amount || 0)}</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Squad Duty</td>
            <td>${escapeHtml(c.squad_session || '-')}</td>
            <td>${c.squad_days || 0} days</td>
            <td>${formatCurrency(c.squad_rate || 0)}</td>
            <td style="text-align:right;font-weight:700;color:var(--primary-600);">${formatCurrency(c.squad_amount || 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grand Total -->
    <div class="grand-total-section animate-fade-in" style="margin-bottom:var(--space-lg);">
      <div class="grand-total-header">
        <div class="grand-total-label">Grand Total</div>
        <div class="grand-total-amount">${formatCurrency(c.grand_total)}</div>
        <div class="grand-total-words">${escapeHtml(c.amount_in_words || '')}</div>
      </div>
    </div>
  `;
}

// ── Edit Mode ───────────────────────────────────────────────────────

function renderEditMode() {
  const c = currentClaim;
  const content = document.getElementById('claimContent');

  content.innerHTML = `
    <div class="claim-detail-header animate-fade-in">
      <div>
        <span class="badge badge-warning" style="font-size:0.85rem;padding:0.3rem 0.8rem;">✏️ Editing</span>
        <span class="badge badge-primary" style="font-size:0.85rem;padding:0.3rem 0.8rem;margin-left:var(--space-xs);">${escapeHtml(c.claim_number)}</span>
      </div>
      <div style="display:flex;gap:var(--space-sm);">
        <button class="btn btn-secondary btn-sm action-btn" data-action="cancelEdit">Cancel</button>
        <button class="btn btn-success btn-sm action-btn" id="saveEditBtn" data-action="saveEdit">
          <span class="spinner"></span>
          <span class="btn-text">💾 Save Changes</span>
        </button>
      </div>
    </div>

    <form id="editForm" class="animate-fade-in">
      <!-- Staff Details -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-md);">👤 Staff Details</h3>
        <div class="form-row">
          <div class="form-group">
            <input type="text" class="form-input" id="editStaffName" value="${escapeHtml(c.staff_name)}" placeholder=" " required>
            <label class="form-label" for="editStaffName">Staff Name *</label>
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="editStaffId" value="${escapeHtml(c.staff_id)}" placeholder=" " required>
            <label class="form-label" for="editStaffId">Staff ID *</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input type="text" class="form-input" id="editDepartment" value="${escapeHtml(c.department)}" placeholder=" " required>
            <label class="form-label" for="editDepartment">Department *</label>
          </div>
          <div class="form-group">
            <select class="form-select" id="editDesignation" required>
              <option value="Assistant Professor" ${c.designation === 'Assistant Professor' ? 'selected' : ''}>Assistant Professor</option>
              <option value="Associate Professor" ${c.designation === 'Associate Professor' ? 'selected' : ''}>Associate Professor</option>
              <option value="Professor" ${c.designation === 'Professor' ? 'selected' : ''}>Professor</option>
              <option value="Technician" ${c.designation === 'Technician' ? 'selected' : ''}>Technician</option>
            </select>
            <label class="form-label" for="editDesignation">Designation *</label>
          </div>
        </div>
      </div>

      <!-- QP Setting -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;justify-content:space-between;">
          <span>📝 Question Paper Setting</span>
          <label class="toggle-switch">
            <input type="checkbox" id="editQpEnabled" ${c.qp_section_enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </h3>
        <div id="editQpBody">
          <div class="form-row">
            <div class="form-group">
              <select class="form-select" id="editQpType">
                <option value="">None</option>
                <option value="qp_with_answer_key" ${c.qp_type === 'qp_with_answer_key' ? 'selected' : ''}>QP with Answer Key (₹1500)</option>
                <option value="qp_only" ${c.qp_type === 'qp_only' ? 'selected' : ''}>Question Paper Only (₹750)</option>
                <option value="answer_key_only" ${c.qp_type === 'answer_key_only' ? 'selected' : ''}>Answer Key Only (₹750)</option>
              </select>
              <label class="form-label">Type</label>
            </div>
            <div class="form-group">
              <select class="form-select" id="editQpQuantity">
                ${Array.from({length: 11}, (_, i) => `<option value="${i}" ${c.qp_quantity === i ? 'selected' : ''}>${i}</option>`).join('')}
              </select>
              <label class="form-label">Quantity (0-10)</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Scrutiny -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-md);">🔍 Paper Scrutiny</h3>
        <div class="form-group">
          <select class="form-select" id="editScrutinyQuantity">
            ${Array.from({length: 11}, (_, i) => `<option value="${i}" ${c.scrutiny_quantity === i ? 'selected' : ''}>${i}</option>`).join('')}
          </select>
          <label class="form-label">Quantity (0-10) — Rate: ₹300</label>
        </div>
      </div>

      <!-- Script Evaluation -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-md);">📊 Script Evaluation</h3>
        <div class="form-row-3">
          <div class="form-group">
            <select class="form-select" id="editEvalAppointment">
              <option value="">None</option>
              <option value="Chief Examiner" ${c.eval_appointment === 'Chief Examiner' ? 'selected' : ''}>Chief Examiner</option>
              <option value="Examiner" ${c.eval_appointment === 'Examiner' ? 'selected' : ''}>Examiner</option>
              <option value="Assistant Examiner" ${c.eval_appointment === 'Assistant Examiner' ? 'selected' : ''}>Assistant Examiner</option>
            </select>
            <label class="form-label">Appointment</label>
          </div>
          <div class="form-group">
            <select class="form-select" id="editEvalPhase">
              <option value="">None</option>
              <option value="Phase 1" ${c.eval_phase === 'Phase 1' ? 'selected' : ''}>Phase 1</option>
              <option value="Phase 2" ${c.eval_phase === 'Phase 2' ? 'selected' : ''}>Phase 2</option>
            </select>
            <label class="form-label">Phase</label>
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="editEvalDate" value="${escapeHtml(c.eval_date || '')}" placeholder=" ">
            <label class="form-label">Date</label>
          </div>
        </div>
        <div class="form-group">
          <input type="number" class="form-input" id="editEvalScripts" value="${c.eval_scripts || 0}" min="0" placeholder=" ">
          <label class="form-label">Number of Scripts — Rate: ₹30</label>
        </div>
      </div>

      <!-- Squad Duty -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-md);">🛡️ Squad Duty</h3>
        <div class="form-row-3">
          <div class="form-group">
            <select class="form-select" id="editSquadDays">
              ${Array.from({length: 11}, (_, i) => `<option value="${i}" ${c.squad_days === i ? 'selected' : ''}>${i}</option>`).join('')}
            </select>
            <label class="form-label">Days (0-10)</label>
          </div>
          <div class="form-group">
            <select class="form-select" id="editSquadSession">
              <option value="">None</option>
              <option value="Both Sessions" ${c.squad_session === 'Both Sessions' ? 'selected' : ''}>Both Sessions (₹400)</option>
              <option value="Forenoon" ${c.squad_session === 'Forenoon' ? 'selected' : ''}>Forenoon (₹200)</option>
              <option value="Afternoon" ${c.squad_session === 'Afternoon' ? 'selected' : ''}>Afternoon (₹200)</option>
            </select>
            <label class="form-label">Session</label>
          </div>
        </div>
      </div>
    </form>
  `;
}

// ── Switch Modes ────────────────────────────────────────────────────

function switchToEdit() {
  isEditMode = true;
  renderEditMode();
}

function cancelEdit() {
  isEditMode = false;
  renderViewMode();
}

// ── Save Edit ───────────────────────────────────────────────────────

async function saveEdit() {
  const btn = document.getElementById('saveEditBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  const payload = {
    staff_name: document.getElementById('editStaffName').value.trim(),
    staff_id: document.getElementById('editStaffId').value.trim(),
    department: document.getElementById('editDepartment').value.trim(),
    designation: document.getElementById('editDesignation').value,
    staff_section_enabled: true,
    qp_section_enabled: document.getElementById('editQpEnabled').checked,
    qp_type: document.getElementById('editQpType').value || null,
    qp_quantity: parseInt(document.getElementById('editQpQuantity').value) || 0,
    scrutiny_quantity: parseInt(document.getElementById('editScrutinyQuantity').value) || 0,
    eval_appointment: document.getElementById('editEvalAppointment').value || null,
    eval_phase: document.getElementById('editEvalPhase').value || null,
    eval_date: document.getElementById('editEvalDate').value || null,
    eval_scripts: parseInt(document.getElementById('editEvalScripts').value) || 0,
    squad_days: parseInt(document.getElementById('editSquadDays').value) || 0,
    squad_session: document.getElementById('editSquadSession').value || null,
  };

  // Validate
  if (!payload.staff_name || !payload.staff_id || !payload.department || !payload.designation) {
    showToast('Staff Name, ID, Department, and Designation are required', 'error');
    btn.classList.remove('loading');
    btn.disabled = false;
    return;
  }

  try {
    const res = await apiFetch(`/api/claims/${currentClaim.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.details ? data.details.join(', ') : data.error;
      showToast(msg, 'error');
      return;
    }

    showToast('Claim updated successfully', 'success');

    // Reload the claim to get fresh data
    const claimId = getClaimIdFromUrl();
    const freshRes = await apiFetch(`/api/claims/${claimId}`);
    currentClaim = await freshRes.json();

    isEditMode = false;
    renderViewMode();

  } catch (err) {
    showToast('Failed to update claim', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Delete ──────────────────────────────────────────────────────────

async function deleteCurrentClaim() {
  if (!currentClaim) return;
  showConfirmDialog(
    'Delete Claim',
    `Are you sure you want to delete claim <strong>${escapeHtml(currentClaim.claim_number)}</strong>? This action cannot be undone.`,
    async () => {
      try {
        const res = await apiFetch(`/api/claims/${currentClaim.id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Claim ${currentClaim.claim_number} deleted`, 'success');
          setTimeout(() => { window.location.href = '/admin/claims'; }, 1000);
        } else {
          const data = await res.json();
          showToast(data.error || 'Failed to delete', 'error');
        }
      } catch (err) {
        showToast('Failed to delete claim', 'error');
      }
    }
  );
}

// ── Print ───────────────────────────────────────────────────────────

function printCurrentClaim() {
  if (!currentClaim) return;
  const printHtml = generatePrintHtmlDetail(currentClaim);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printHtml);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

function generatePrintHtmlDetail(claim) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Claim ${escapeHtml(claim.claim_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; padding: 15mm 20mm; color: #000; }
    @page { size: A4; margin: 15mm 20mm; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10pt; margin-bottom: 15pt; }
    .header h1 { font-size: 16pt; text-transform: uppercase; letter-spacing: 2pt; margin-bottom: 4pt; }
    .header h2 { font-size: 13pt; text-transform: uppercase; }
    .header .sub { font-size: 10pt; margin-top: 4pt; color: #444; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10pt; font-size: 10pt; }
    .info-label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 5pt 8pt; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 9pt; }
    .amount { text-align: right; font-weight: bold; }
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
    <div class="sub">Claim No: ${escapeHtml(claim.claim_number)} | Date: ${formatDate(claim.created_at)}</div>
  </div>
  <div class="info-row">
    <div><span class="info-label">Staff Name:</span> ${escapeHtml(claim.staff_name || '-')}</div>
    <div><span class="info-label">Staff ID:</span> ${escapeHtml(claim.staff_id || '-')}</div>
  </div>
  <div class="info-row">
    <div><span class="info-label">Department:</span> ${escapeHtml(claim.department || '-')}</div>
    <div><span class="info-label">Designation:</span> ${escapeHtml(claim.designation || '-')}</div>
  </div>
  <table>
    <thead><tr><th>S.No</th><th>Description</th><th>Details</th><th>Quantity</th><th>Rate (₹)</th><th style="text-align:right">Amount (₹)</th></tr></thead>
    <tbody>
      ${claim.qp_section_enabled ? `<tr><td>1</td><td>Question Paper Setting</td><td>${qpTypeLabel(claim.qp_type)}</td><td>${claim.qp_quantity || 0}</td><td>${claim.qp_rate || 0}</td><td class="amount">${Number(claim.qp_amount || 0).toLocaleString('en-IN')}</td></tr>` : ''}
      <tr><td>${claim.qp_section_enabled ? '2' : '1'}</td><td>Paper Scrutiny</td><td>-</td><td>${claim.scrutiny_quantity || 0}</td><td>300</td><td class="amount">${Number(claim.scrutiny_amount || 0).toLocaleString('en-IN')}</td></tr>
      <tr><td>${claim.qp_section_enabled ? '3' : '2'}</td><td>Script Evaluation</td><td>${escapeHtml(claim.eval_appointment || '-')} | ${escapeHtml(claim.eval_phase || '-')} | ${escapeHtml(claim.eval_date || '-')}</td><td>${claim.eval_scripts || 0}</td><td>30</td><td class="amount">${Number(claim.eval_amount || 0).toLocaleString('en-IN')}</td></tr>
      <tr><td>${claim.qp_section_enabled ? '4' : '3'}</td><td>Squad Duty</td><td>${escapeHtml(claim.squad_session || '-')}</td><td>${claim.squad_days || 0} days</td><td>${claim.squad_rate || 0}</td><td class="amount">${Number(claim.squad_amount || 0).toLocaleString('en-IN')}</td></tr>
      <tr class="grand-total"><td colspan="5" style="text-align:right;">GRAND TOTAL</td><td class="amount" style="font-size:13pt;">₹${Number(claim.grand_total || 0).toLocaleString('en-IN')}</td></tr>
    </tbody>
  </table>
  <div class="words"><strong>Amount in Words:</strong> ${escapeHtml(claim.amount_in_words || '')}</div>
  <div class="signatures">
    <div class="sig-block"><div class="sig-line">Claimant</div><div class="sig-desc">Signature & Date</div></div>
    <div class="sig-block"><div class="sig-line">Head of Department</div><div class="sig-desc">Signature & Seal</div></div>
    <div class="sig-block"><div class="sig-line">Principal / Accounts</div><div class="sig-desc">Signature & Seal</div></div>
  </div>
  <div class="footer">Generated by APRIL MAY Remuneration Claim System | ${new Date().toLocaleDateString('en-IN')}</div>
</body>
</html>`;
}

async function logout() {
  sessionStorage.setItem('logged_out', 'true');
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
  window.location.href = '/admin';
}
