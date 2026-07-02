/**
 * Claims List Logic
 * 
 * Search, filter, sort, pagination, row selection,
 * export, delete, and print for the admin claims table.
 */

let currentPage = 1;
let currentSort = 'newest';
let selectedIds = new Set();
let searchDebounce = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAdminInfo();
  loadDepartments();
  loadClaims();
  bindEvents();

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

// ── Load Admin Info ─────────────────────────────────────────────────

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

// ── Load Departments for Filter ─────────────────────────────────────

async function loadDepartments() {
  try {
    const res = await apiFetch('/api/admin/departments');
    if (res && res.ok) {
      const data = await res.json();
      const select = document.getElementById('filterDepartment');
      data.departments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        select.appendChild(opt);
      });
    }
  } catch (e) {}
}

// ── Build Query String ──────────────────────────────────────────────

function getQueryParams() {
  const params = new URLSearchParams();
  params.set('page', currentPage);
  params.set('sort', currentSort);

  const search = document.getElementById('searchInput').value.trim();
  if (search) params.set('search', search);

  const dept = document.getElementById('filterDepartment').value;
  if (dept) params.set('department', dept);

  const desig = document.getElementById('filterDesignation').value;
  if (desig) params.set('designation', desig);

  const dateFrom = document.getElementById('filterDateFrom').value;
  if (dateFrom) params.set('date_from', dateFrom);

  const dateTo = document.getElementById('filterDateTo').value;
  if (dateTo) params.set('date_to', dateTo);

  const amtMin = document.getElementById('filterAmountMin').value;
  if (amtMin) params.set('amount_min', amtMin);

  const amtMax = document.getElementById('filterAmountMax').value;
  if (amtMax) params.set('amount_max', amtMax);

  return params.toString();
}

function getFilterBody() {
  return {
    search: document.getElementById('searchInput').value.trim() || undefined,
    department: document.getElementById('filterDepartment').value || undefined,
    designation: document.getElementById('filterDesignation').value || undefined,
    date_from: document.getElementById('filterDateFrom').value || undefined,
    date_to: document.getElementById('filterDateTo').value || undefined,
    amount_min: document.getElementById('filterAmountMin').value || undefined,
    amount_max: document.getElementById('filterAmountMax').value || undefined,
  };
}

// ── Load Claims ─────────────────────────────────────────────────────

async function loadClaims() {
  const tbody = document.getElementById('claimsTableBody');
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--text-muted);">Loading...</td></tr>`;

  try {
    const res = await apiFetch(`/api/claims?${getQueryParams()}`);
    if (!res || !res.ok) return;
    const data = await res.json();

    renderClaimsTable(data.claims);
    renderPagination(data.pagination);

  } catch (err) {
    console.error('Load claims error:', err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--danger-500);">Failed to load claims</td></tr>`;
  }
}

// ── Render Claims Table ─────────────────────────────────────────────

function renderClaimsTable(claims) {
  const tbody = document.getElementById('claimsTableBody');

  if (!claims || claims.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state" style="padding:3rem;">
      <div class="empty-state-icon">📄</div>
      <div class="empty-state-title">No claims found</div>
      <p style="color:var(--text-muted);font-size:0.85rem;">Try adjusting your search or filters</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = claims.map(c => `
    <tr data-id="${c.id}">
      <td><input type="checkbox" class="row-checkbox claim-checkbox" value="${c.id}" ${selectedIds.has(c.id) ? 'checked' : ''}></td>
      <td><span class="badge badge-primary">${escapeHtml(c.claim_number)}</span></td>
      <td style="font-size:0.82rem;color:var(--text-muted);">${formatDate(c.created_at)}</td>
      <td style="font-weight:600;">${escapeHtml(c.staff_name)}</td>
      <td>${escapeHtml(c.staff_id)}</td>
      <td>${escapeHtml(c.department)}</td>
      <td><span class="badge badge-success">${escapeHtml(c.designation)}</span></td>
      <td style="font-weight:700;color:var(--primary-600);">${formatCurrency(c.grand_total)}</td>
      <td>
        <div class="table-row-actions">
          <button class="btn btn-icon action-btn" data-action="view" data-id="${c.id}" title="View">👁️</button>
          <button class="btn btn-icon action-btn" data-action="edit" data-id="${c.id}" title="Edit">✏️</button>
          <button class="btn btn-icon action-btn" data-action="print" data-id="${c.id}" title="Print">🖨️</button>
          <button class="btn btn-icon action-btn delete" data-action="delete" data-id="${c.id}" data-claim="${escapeHtml(c.claim_number)}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Rebind checkboxes
  document.querySelectorAll('.claim-checkbox').forEach(cb => {
    cb.addEventListener('change', updateSelection);
  });
}

// ── Render Pagination ───────────────────────────────────────────────

function renderPagination(pagination) {
  const info = document.getElementById('paginationInfo');
  const controls = document.getElementById('paginationControls');
  const { page, limit, total, totalPages } = pagination;

  const start = total > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  info.textContent = `Showing ${start}–${end} of ${total} claims`;

  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }

  let buttons = '';
  // Previous
  buttons += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">‹</button>`;

  // Page numbers (show max 7)
  const maxVisible = 7;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    buttons += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) buttons += `<span style="padding:0 4px;color:var(--text-muted);">…</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    buttons += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) buttons += `<span style="padding:0 4px;color:var(--text-muted);">…</span>`;
    buttons += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // Next
  buttons += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})">›</button>`;

  controls.innerHTML = buttons;
}

// ── Selection Management ────────────────────────────────────────────

function updateSelection() {
  const checkboxes = document.querySelectorAll('.claim-checkbox');
  selectedIds.clear();
  checkboxes.forEach(cb => {
    if (cb.checked) selectedIds.add(parseInt(cb.value));
  });

  const count = selectedIds.size;
  document.getElementById('selectedCount').textContent = count;
  document.getElementById('exportSelectedBtn').disabled = count === 0;

  // Update "select all" checkbox
  const selectAll = document.getElementById('selectAll');
  selectAll.checked = checkboxes.length > 0 && count === checkboxes.length;
}

// ── Event Bindings ──────────────────────────────────────────────────

function bindEvents() {
  // Search with debounce
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentPage = 1;
      loadClaims();
    }, 400);
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    loadClaims();
  });

  // Filter panel toggle
  document.getElementById('toggleFilterBtn').addEventListener('click', () => {
    document.getElementById('filterPanel').classList.toggle('open');
  });

  // Apply filters
  document.getElementById('applyFiltersBtn').addEventListener('click', () => {
    currentPage = 1;
    loadClaims();
  });

  // Clear filters
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterDesignation').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterAmountMin').value = '';
    document.getElementById('filterAmountMax').value = '';
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    loadClaims();
  });

  // Select all
  document.getElementById('selectAll').addEventListener('change', (e) => {
    document.querySelectorAll('.claim-checkbox').forEach(cb => {
      cb.checked = e.target.checked;
    });
    updateSelection();
  });

  // Export buttons
  document.getElementById('exportAllBtn').addEventListener('click', exportAll);
  document.getElementById('exportFilteredBtn').addEventListener('click', exportFiltered);
  document.getElementById('exportSelectedBtn').addEventListener('click', exportSelected);

  // Table action buttons (delegation)
  document.getElementById('claimsTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);
    const claimNum = btn.dataset.claim;

    if (action === 'view') {
      viewClaim(id);
    } else if (action === 'edit') {
      editClaim(id);
    } else if (action === 'print') {
      printClaim(id);
    } else if (action === 'delete') {
      deleteClaim(id, claimNum);
    }
  });
}

// ── Page Navigation ─────────────────────────────────────────────────

function goToPage(page) {
  currentPage = page;
  loadClaims();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Claim Actions ───────────────────────────────────────────────────

function viewClaim(id) {
  window.location.href = `/admin/claim/${id}`;
}

function editClaim(id) {
  window.location.href = `/admin/claim/${id}?edit=true`;
}

function deleteClaim(id, claimNumber) {
  showConfirmDialog(
    'Delete Claim',
    `Are you sure you want to delete claim <strong>${claimNumber}</strong>? This action cannot be undone.`,
    async () => {
      try {
        const res = await apiFetch(`/api/claims/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Claim ${claimNumber} has been deleted`, 'success');
          loadClaims();
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

async function printClaim(id) {
  try {
    const res = await apiFetch(`/api/claims/${id}`);
    if (!res || !res.ok) {
      showToast('Failed to load claim for printing', 'error');
      return;
    }
    const claim = await res.json();
    const printHtml = generatePrintHtml(claim);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  } catch (err) {
    showToast('Print failed', 'error');
  }
}

// ── Export Functions ─────────────────────────────────────────────────

function exportAll() {
  window.location.href = '/api/export/all';
}

async function exportFiltered() {
  try {
    const res = await apiFetch('/api/export/filtered', {
      method: 'POST',
      body: JSON.stringify(getFilterBody()),
    });
    if (res.ok) {
      const blob = await res.blob();
      downloadBlob(blob, `Filtered_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      showToast('Export failed', 'error');
    }
  } catch (err) {
    showToast('Export failed', 'error');
  }
}

async function exportSelected() {
  if (selectedIds.size === 0) return;
  try {
    const res = await apiFetch('/api/export/selected', {
      method: 'POST',
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      const blob = await res.blob();
      downloadBlob(blob, `Selected_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      showToast('Export failed', 'error');
    }
  } catch (err) {
    showToast('Export failed', 'error');
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Excel file downloaded', 'success');
}

// ── Print HTML Generator (reused from app.js) ───────────────────────

function generatePrintHtml(claim) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Remuneration Claim - ${escapeHtml(claim.claim_number)}</title>
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
      <tr class="grand-total"><td colspan="5" style="text-align:right;font-weight:bold;">GRAND TOTAL</td><td class="amount" style="font-size:13pt;">₹${Number(claim.grand_total || 0).toLocaleString('en-IN')}</td></tr>
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
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  window.location.href = '/admin';
}
