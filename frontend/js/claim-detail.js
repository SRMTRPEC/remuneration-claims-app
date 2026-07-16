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
      const data = await res.json();
      if (data.role !== 'admin') {
        window.location.href = '/admin';
        return;
      }
      const me = data.user;
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

function formatEvalPhaseView(c) {
  let str = c.eval_phase;
  if (!str) return '-';
  if (typeof str === 'string' && str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) {
        return arr.map(s => `<strong>${s.phase}</strong>: ${s.appointment || '-'} | ${s.date || '-'} | ${s.scripts || 0} scripts`).join('<br>');
      }
    } catch(e) {}
  }
  return `${escapeHtml(c.eval_appointment || '-')} | ${escapeHtml(c.eval_phase || '-')} | ${escapeHtml(c.eval_date || '-')}`;
}

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
      <div class="claim-detail-info" style="border-top: 1px solid var(--border-color); padding-top: var(--space-md); margin-top: var(--space-md);">
        <div class="detail-field">
          <div class="detail-field-label">Bank Name</div>
          <div class="detail-field-value">${escapeHtml(c.bank_name || '-')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Branch Name</div>
          <div class="detail-field-value">${escapeHtml(c.bank_branch || '-')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Account Number</div>
          <div class="detail-field-value">${escapeHtml(c.account_number ? "'" + c.account_number : '-')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">IFSC Code</div>
          <div class="detail-field-value">${escapeHtml(c.ifsc_code || '-')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Mobile Number</div>
          <div class="detail-field-value">${escapeHtml(c.mobile_number || '-')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Passbook Photo/PDF</div>
          <div class="detail-field-value">
            ${c.passbook_file ? `<a href="${c.passbook_file}" download="passbook_${escapeHtml(c.staff_id)}" target="_blank" style="color: var(--primary-500); text-decoration: underline; font-weight: 500;">View / Download</a>` : '-'}
          </div>
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
            <td>${formatEvalPhaseView(c)}</td>
            <td>${c.eval_scripts || 0} scripts total</td>
            <td>₹30</td>
            <td style="text-align:right;font-weight:700;color:var(--primary-600);">${formatCurrency(c.eval_amount || 0)}</td>
          </tr>
          ${c.practical_squad_amount > 0 ? `
          <tr>
            <td style="font-weight:600;">Practical Squad</td>
            <td>—</td>
            <td>${c.practical_squad_sessions || 0} sessions</td>
            <td>${formatCurrency(c.practical_squad_rate || 0)}</td>
            <td style="text-align:right;font-weight:700;color:var(--primary-600);">${formatCurrency(c.practical_squad_amount || 0)}</td>
          </tr>` : ''}
          <tr>
            <td style="font-weight:600;">Squad Duty</td>
            <td>${
              c.squad_sessions && typeof c.squad_sessions === 'object'
                ? Object.entries(c.squad_sessions).filter(([_, count]) => count > 0).map(([s, count]) => `${count}x ${s}`).join(', ') || '-'
                : escapeHtml(c.squad_session || '-')
            }</td>
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
  
  let p1_1 = {}, p1_2 = {}, p2 = {};
  if (typeof c.eval_phase === 'string' && c.eval_phase.startsWith('[')) {
    try {
      const arr = JSON.parse(c.eval_phase);
      p1_1 = arr.find(s => s.phase === 'Phase 1' && s.date === '20-06-2026') || {};
      p1_2 = arr.find(s => s.phase === 'Phase 1' && s.date === '21-06-2026') || {};
      p2 = arr.find(s => s.phase === 'Phase 2') || {};
    } catch(e) {}
  } else if (c.eval_phase === 'Phase 1') {
    if (c.eval_date === 'Both Days') {
      p1_1 = { appointment: c.eval_appointment, date: '20-06-2026', scripts: Math.ceil((c.eval_scripts || 0) / 2) };
      p1_2 = { appointment: c.eval_appointment, date: '21-06-2026', scripts: Math.floor((c.eval_scripts || 0) / 2) };
    } else if (c.eval_date === '20-06-2026') {
      p1_1 = { appointment: c.eval_appointment, date: '20-06-2026', scripts: c.eval_scripts };
    } else if (c.eval_date === '21-06-2026') {
      p1_2 = { appointment: c.eval_appointment, date: '21-06-2026', scripts: c.eval_scripts };
    }
  } else if (c.eval_phase === 'Phase 2') {
    p2 = { appointment: c.eval_appointment, date: c.eval_date, scripts: c.eval_scripts };
  }

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
          <div class="form-group input-prefix-group">
            <span class="input-prefix">TRPT</span>
            <input type="text" class="form-input" id="editStaffId" value="${escapeHtml((c.staff_id || '').replace(/^TRPT/i, ''))}" placeholder=" " required>
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
              <option value="Others" ${!['Assistant Professor', 'Associate Professor', 'Professor'].includes(c.designation) ? 'selected' : ''}>Others</option>
            </select>
            <label class="form-label" for="editDesignation">Designation *</label>
          </div>
        </div>
        <div class="form-row" id="editOtherDesignationRow" style="display: none;">
          <div class="form-group" style="grid-column: span 2;">
            <input type="text" class="form-input" id="editOtherDesignation" placeholder=" ">
            <label class="form-label" for="editOtherDesignation">Please specify your Designation *</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <select class="form-select" id="editBankName" required>
              <option value="">Select Bank</option>
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
            <label class="form-label" for="editBankName">Bank Name *</label>
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="editBankBranch" value="${escapeHtml(c.bank_branch || '')}" placeholder=" " required>
            <label class="form-label" for="editBankBranch">Branch Name *</label>
          </div>
        </div>
        <div class="form-row" id="editOtherBankRow" style="display: none;">
          <div class="form-group" style="grid-column: span 2;">
            <input type="text" class="form-input" id="editOtherBankName" placeholder=" ">
            <label class="form-label" for="editOtherBankName">Please specify your Bank Name *</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input type="text" class="form-input" id="editAccountNumber" value="${escapeHtml(c.account_number || '')}" placeholder=" " required>
            <label class="form-label" for="editAccountNumber">Account Number *</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input type="text" class="form-input" id="editIfscCode" value="${escapeHtml(c.ifsc_code || '')}" placeholder=" " required>
            <label class="form-label" for="editIfscCode">IFSC Code *</label>
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="editMobileNumber" value="${escapeHtml(c.mobile_number || '')}" placeholder=" " required>
            <label class="form-label" for="editMobileNumber">Mobile Number *</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="grid-column: span 2;">
            <input type="file" class="form-input" id="editPassbookFile" accept="image/*,application/pdf" style="padding-top: 12px; height: 52px;">
            <label class="form-label" for="editPassbookFile" style="transform: translateY(-26px) scale(0.85); left: var(--space-sm);">Update Passbook Photo / PDF (Optional)</label>
          </div>
        </div>
      </div>

      <!-- Question Paper Setting -->
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
        
        <!-- Phase 1 -->
        <h4 style="margin-bottom:var(--space-sm); color:var(--text-secondary);">Phase 1</h4>
        
        <div style="margin-bottom: var(--space-sm);"><strong>20-06-2026</strong></div>
        <div class="form-row">
          <div class="form-group">
            <select class="form-select" id="editEvalAppt1_1">
              <option value="">None</option>
              <option value="Chief Examiner/Board Chairman" ${p1_1.appointment === 'Chief Examiner/Board Chairman' ? 'selected' : ''}>Chief Examiner/Board Chairman</option>
              <option value="Examiner" ${p1_1.appointment === 'Examiner' ? 'selected' : ''}>Examiner</option>
              <option value="Assistant Examiner" ${p1_1.appointment === 'Assistant Examiner' ? 'selected' : ''}>Assistant Examiner</option>
            </select>
            <label class="form-label">Appointment (20-06)</label>
          </div>
          <div class="form-group">
            <input type="number" class="form-input" id="editEvalScripts1_1" value="${p1_1.scripts || 0}" min="0" placeholder=" ">
            <label class="form-label">Scripts (₹30 each)</label>
          </div>
        </div>

        <div style="margin-bottom: var(--space-sm); margin-top: var(--space-md);"><strong>21-06-2026</strong></div>
        <div class="form-row">
          <div class="form-group">
            <select class="form-select" id="editEvalAppt1_2">
              <option value="">None</option>
              <option value="Chief Examiner/Board Chairman" ${p1_2.appointment === 'Chief Examiner/Board Chairman' ? 'selected' : ''}>Chief Examiner/Board Chairman</option>
              <option value="Examiner" ${p1_2.appointment === 'Examiner' ? 'selected' : ''}>Examiner</option>
              <option value="Assistant Examiner" ${p1_2.appointment === 'Assistant Examiner' ? 'selected' : ''}>Assistant Examiner</option>
            </select>
            <label class="form-label">Appointment (21-06)</label>
          </div>
          <div class="form-group">
            <input type="number" class="form-input" id="editEvalScripts1_2" value="${p1_2.scripts || 0}" min="0" placeholder=" ">
            <label class="form-label">Scripts (₹30 each)</label>
          </div>
        </div>

        <!-- Phase 2 -->
        <h4 style="margin-bottom:var(--space-sm); color:var(--text-secondary); margin-top:var(--space-md);">Phase 2</h4>
        <div style="margin-bottom: var(--space-sm);"><strong>01-07-2026</strong></div>
        <div class="form-row">
          <div class="form-group">
            <select class="form-select" id="editEvalAppt2_1">
              <option value="">None</option>
              <option value="Chief Examiner/Board Chairman" ${p2.appointment === 'Chief Examiner/Board Chairman' ? 'selected' : ''}>Chief Examiner/Board Chairman</option>
              <option value="Examiner" ${p2.appointment === 'Examiner' ? 'selected' : ''}>Examiner</option>
              <option value="Assistant Examiner" ${p2.appointment === 'Assistant Examiner' ? 'selected' : ''}>Assistant Examiner</option>
            </select>
            <label class="form-label">Appointment (01-07)</label>
          </div>
          <div class="form-group">
            <input type="number" class="form-input" id="editEvalScripts2_1" value="${p2.scripts || 0}" min="0" placeholder=" ">
            <label class="form-label">Scripts (₹30 each)</label>
          </div>
        </div>
      </div>

      <!-- Practical Squad -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;justify-content:space-between;">
          <span>🔬 Practical Squad</span>
          <label class="toggle-switch">
            <input type="checkbox" id="editPracticalSquadEnabled" ${c.practical_squad_enabled ? 'checked' : ''} onchange="document.getElementById('editPracticalSquadBody').style.display = this.checked ? 'block' : 'none'">
            <span class="toggle-slider"></span>
          </label>
        </h3>
        <div id="editPracticalSquadBody" style="${c.practical_squad_enabled ? 'display:block;' : 'display:none;'}">
          <div class="form-row">
            <div class="form-group">
              <input type="number" class="form-input" id="editPracticalSquadSessions" value="${c.practical_squad_sessions || 0}" min="0" placeholder=" ">
              <label class="form-label">Number of Sessions</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Squad Duty -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <h3 style="margin-bottom:var(--space-md);">🛡️ Squad Duty</h3>
        <div class="form-row-3" style="margin-bottom:var(--space-md);">
          <div class="form-group" style="align-self: center;">
            <div style="font-weight: 600; color: var(--text-primary);">Forenoon</div>
          </div>
          <div class="form-group">
            <input type="number" class="form-input" id="editSquadForenoon" value="${c.squad_sessions?.Forenoon || 0}" min="0" max="10" placeholder=" ">
            <label class="form-label">Days (0-10)</label>
          </div>
        </div>
        <div class="form-row-3" style="margin-bottom:var(--space-md);">
          <div class="form-group" style="align-self: center;">
            <div style="font-weight: 600; color: var(--text-primary);">Afternoon</div>
          </div>
          <div class="form-group">
            <input type="number" class="form-input" id="editSquadAfternoon" value="${c.squad_sessions?.Afternoon || 0}" min="0" max="10" placeholder=" ">
            <label class="form-label">Days (0-10)</label>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group" style="align-self: center;">
            <div style="font-weight: 600; color: var(--text-primary);">Both Sessions</div>
          </div>
          <div class="form-group">
            <input type="number" class="form-input" id="editSquadBoth" value="${c.squad_sessions && c.squad_sessions['Both Sessions'] ? c.squad_sessions['Both Sessions'] : 0}" min="0" max="10" placeholder=" ">
            <label class="form-label">Days (0-10)</label>
          </div>
        </div>
      </div>
    </form>
  `;
}

// ── Switch Modes ────────────────────────────────────────────────────

let currentEditPassbookBase64 = null;

function switchToEdit() {
  isEditMode = true;
  renderEditMode();

  if (currentClaim && currentClaim.designation) {
    const desigSelect = document.getElementById('editDesignation');
    const desigOptions = Array.from(desigSelect.options).map(opt => opt.value);
    if (desigOptions.includes(currentClaim.designation)) {
      desigSelect.value = currentClaim.designation;
    } else {
      desigSelect.value = 'Others';
      document.getElementById('editOtherDesignationRow').style.display = 'block';
      document.getElementById('editOtherDesignation').value = currentClaim.designation;
      document.getElementById('editOtherDesignation').required = true;
    }
  }
  
  if (currentClaim && currentClaim.bank_name) {
    const bankSelect = document.getElementById('editBankName');
    const options = Array.from(bankSelect.options).map(opt => opt.value);
    if (options.includes(currentClaim.bank_name)) {
      bankSelect.value = currentClaim.bank_name;
    } else {
      bankSelect.value = 'Other';
      document.getElementById('editOtherBankRow').style.display = 'block';
      document.getElementById('editOtherBankName').value = currentClaim.bank_name;
      document.getElementById('editOtherBankName').required = true;
    }
  }

  const bankNameInput = document.getElementById('editBankName');
  if (bankNameInput) {
    bankNameInput.addEventListener('change', (e) => {
      const otherBankRow = document.getElementById('editOtherBankRow');
      const otherBankInput = document.getElementById('editOtherBankName');
      if (e.target.value === 'Other') {
        otherBankRow.style.display = 'block';
        otherBankInput.required = true;
      } else {
        otherBankRow.style.display = 'none';
        otherBankInput.required = false;
      }
    });
  }

  const desigInput = document.getElementById('editDesignation');
  if (desigInput) {
    desigInput.addEventListener('change', (e) => {
      const otherRow = document.getElementById('editOtherDesignationRow');
      const otherInput = document.getElementById('editOtherDesignation');
      if (e.target.value === 'Others') {
        otherRow.style.display = 'block';
        otherInput.required = true;
      } else {
        otherRow.style.display = 'none';
        otherInput.required = false;
      }
    });
  }
  
  currentEditPassbookBase64 = null; // Reset on edit open
  const editPassbookInput = document.getElementById('editPassbookFile');
  if (editPassbookInput) {
    editPassbookInput.addEventListener('change', async (e) => {
      let file = e.target.files[0];
      if (file) {
        if (file.type === 'application/pdf') {
          if (file.size > 2 * 1024 * 1024) {
            alert('PDF files must be smaller than 2MB. Please compress your PDF and try again.');
            editPassbookInput.value = '';
            currentEditPassbookBase64 = null;
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
        reader.onload = (evt) => currentEditPassbookBase64 = evt.target.result;
        reader.readAsDataURL(file);
      } else {
        currentEditPassbookBase64 = null;
      }
    });
  }
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
    staff_id: 'TRPT' + document.getElementById('editStaffId').value.trim().replace(/^TRPT/i, ''),
    department: document.getElementById('editDepartment').value.trim(),
    designation: document.getElementById('editDesignation').value === 'Others'
                 ? document.getElementById('editOtherDesignation').value.trim()
                 : document.getElementById('editDesignation').value,
    bank_name: document.getElementById('editBankName').value === 'Other' 
               ? document.getElementById('editOtherBankName').value.trim() 
               : document.getElementById('editBankName').value.trim(),
    bank_branch: document.getElementById('editBankBranch').value.trim(),
    account_number: document.getElementById('editAccountNumber').value.trim(),
    ifsc_code: document.getElementById('editIfscCode').value.trim(),
    mobile_number: document.getElementById('editMobileNumber').value.trim(),
    passbook_file: currentEditPassbookBase64 || null,
    staff_section_enabled: true,
    qp_section_enabled: document.getElementById('editQpEnabled').checked,
    qp_type: document.getElementById('editQpType').value || null,
    qp_quantity: parseInt(document.getElementById('editQpQuantity').value) || 0,
    scrutiny_quantity: parseInt(document.getElementById('editScrutinyQuantity').value) || 0,
    eval_sessions: (() => {
      let sessions = [];
      const s1_1 = parseInt(document.getElementById('editEvalScripts1_1').value) || 0;
      const a1_1 = document.getElementById('editEvalAppt1_1').value;
      if (s1_1 > 0 || a1_1) {
        sessions.push({ phase: 'Phase 1', appointment: a1_1 || null, date: '20-06-2026', scripts: s1_1 });
      }
      
      const s1_2 = parseInt(document.getElementById('editEvalScripts1_2').value) || 0;
      const a1_2 = document.getElementById('editEvalAppt1_2').value;
      if (s1_2 > 0 || a1_2) {
        sessions.push({ phase: 'Phase 1', appointment: a1_2 || null, date: '21-06-2026', scripts: s1_2 });
      }
      
      const s2_1 = parseInt(document.getElementById('editEvalScripts2_1').value) || 0;
      const a2_1 = document.getElementById('editEvalAppt2_1').value;
      if (s2_1 > 0 || a2_1) {
        sessions.push({ phase: 'Phase 2', appointment: a2_1 || null, date: '01-07-2026', scripts: s2_1 });
      }
      return sessions;
    })(),
    practical_squad_enabled: document.getElementById('editPracticalSquadEnabled')?.checked || false,
    practical_squad_sessions: parseInt(document.getElementById('editPracticalSquadSessions')?.value) || 0,
    squad_sessions: {
      Forenoon: parseInt(document.getElementById('editSquadForenoon').value) || 0,
      Afternoon: parseInt(document.getElementById('editSquadAfternoon').value) || 0,
      "Both Sessions": parseInt(document.getElementById('editSquadBoth').value) || 0
    },
  };

  // Validate
  if (!payload.staff_name || !payload.staff_id || !payload.department || !payload.designation || !payload.bank_name || !payload.bank_branch || !payload.account_number || !payload.ifsc_code || !payload.mobile_number) {
    showToast('All Staff and Bank Details are required', 'error');
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
  <div class="info-row" style="border-top:1px dashed #ccc; padding-top:10pt; margin-top:5pt;">
    <div><span class="info-label">Bank Name:</span> ${escapeHtml(claim.bank_name || '-')}</div>
    <div><span class="info-label">Branch Name:</span> ${escapeHtml(claim.bank_branch || '-')}</div>
  </div>
  <div class="info-row">
    <div><span class="info-label">A/C No:</span> ${escapeHtml(claim.account_number ? "'" + claim.account_number : '-')}</div>
    <div><span class="info-label">IFSC Code:</span> ${escapeHtml(claim.ifsc_code || '-')}</div>
  </div>
  <div class="info-row">
    <div><span class="info-label">Mobile:</span> ${escapeHtml(claim.mobile_number || '-')}</div>
    <div></div>
  </div>

  <table>
    <thead><tr><th>S.No</th><th>Description</th><th>Details</th><th>Quantity</th><th>Rate (₹)</th><th style="text-align:right">Amount (₹)</th></tr></thead>
    <tbody>
      ${claim.qp_section_enabled ? `<tr><td>1</td><td>Question Paper Setting</td><td>${qpTypeLabel(claim.qp_type)}</td><td>${claim.qp_quantity || 0}</td><td>${claim.qp_rate || 0}</td><td class="amount">${Number(claim.qp_amount || 0).toLocaleString('en-IN')}</td></tr>` : ''}
      <tr><td>${claim.qp_section_enabled ? '2' : '1'}</td><td>Paper Scrutiny</td><td>-</td><td>${claim.scrutiny_quantity || 0}</td><td>300</td><td class="amount">${Number(claim.scrutiny_amount || 0).toLocaleString('en-IN')}</td></tr>
      <tr><td>${claim.qp_section_enabled ? '3' : '2'}</td><td>Script Evaluation</td><td>${formatEvalPhasePrint(claim)}</td><td>${claim.eval_scripts || 0}</td><td>30</td><td class="amount">${Number(claim.eval_amount || 0).toLocaleString('en-IN')}</td></tr>
      ${claim.practical_squad_amount > 0 ? `<tr><td>${claim.qp_section_enabled ? '4' : '3'}</td><td>Practical Squad</td><td>-</td><td>${claim.practical_squad_sessions || 0} sessions</td><td>${claim.practical_squad_rate || 0}</td><td class="amount">${Number(claim.practical_squad_amount || 0).toLocaleString('en-IN')}</td></tr>` : ''}
      <tr><td>${claim.qp_section_enabled ? (claim.practical_squad_amount > 0 ? '5' : '4') : (claim.practical_squad_amount > 0 ? '4' : '3')}</td><td>Squad Duty</td><td>${formatSquadSessionPrint(claim)}</td><td>${claim.squad_days || 0} days</td><td>${claim.squad_rate || 0}</td><td class="amount">${Number(claim.squad_amount || 0).toLocaleString('en-IN')}</td></tr>
      <tr class="grand-total"><td colspan="5" style="text-align:right;">GRAND TOTAL</td><td class="amount" style="font-size:13pt;">₹${Number(claim.grand_total || 0).toLocaleString('en-IN')}</td></tr>
    </tbody>
  </table>
  <div class="words"><strong>Amount in Words:</strong> ${escapeHtml(claim.amount_in_words || '')}</div>
  <div class="signatures">
    <div class="sig-block"><div class="sig-line">Staff</div><div class="sig-desc">Signature & Date</div></div>
    <div class="sig-block"><div class="sig-line">COE</div><div class="sig-desc">Signature & Seal</div></div>
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
