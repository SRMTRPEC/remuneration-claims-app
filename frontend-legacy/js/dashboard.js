/**
 * Dashboard Logic
 * 
 * Loads stats, recent claims, department breakdown, and audit log.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();

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

  const recentClaimsBody = document.getElementById('recentClaimsBody');
  if (recentClaimsBody) {
    recentClaimsBody.addEventListener('click', (e) => {
      const row = e.target.closest('.clickable-row');
      if (!row) return;
      window.location.href = '/admin/claim/' + row.dataset.id;
    });
  }
});

async function loadDashboard() {
  try {
    // Load stats
    const statsRes = await apiFetch('/api/claims/stats');
    if (!statsRes || !statsRes.ok) return;
    const stats = await statsRes.json();

    document.getElementById('statTotalClaims').textContent = stats.totalClaims.toLocaleString();
    document.getElementById('statTodayClaims').textContent = stats.todayClaims.toLocaleString();
    document.getElementById('statTotalAmount').textContent = formatCurrency(stats.totalAmount);
    document.getElementById('statAvgAmount').textContent = formatCurrency(stats.avgAmount);

    // Load admin info
    const meRes = await apiFetch('/api/auth/me');
    if (meRes && meRes.ok) {
      const data = await meRes.json();
      if (data.role !== 'admin') {
        window.location.href = '/admin';
        return;
      }
      const me = data.user;
      document.getElementById('userName').textContent = me.fullName || me.username;
      document.getElementById('userAvatar').textContent = (me.fullName || me.username).charAt(0).toUpperCase();
    }

    // Recent claims table
    renderRecentClaims(stats.recentClaims);

    // Department breakdown
    renderDeptBreakdown(stats.deptBreakdown);

    // Audit log
    loadAuditLog();

  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to load dashboard data', 'error');
  }
}

function renderRecentClaims(claims) {
  const tbody = document.getElementById('recentClaimsBody');
  if (!claims || claims.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding:2rem;">
      <div class="empty-state-icon">📄</div>
      <div class="empty-state-title">No claims yet</div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = claims.map(c => `
    <tr style="cursor:pointer;" class="clickable-row" data-id="${c.id}">
      <td><span class="badge badge-primary">${escapeHtml(c.claim_number)}</span></td>
      <td style="font-weight:600;">${escapeHtml(c.staff_name)}</td>
      <td>${escapeHtml(c.staff_id)}</td>
      <td>${escapeHtml(c.department)}</td>
      <td>${escapeHtml(c.designation)}</td>
      <td style="font-weight:700;color:var(--primary-600);">${formatCurrency(c.grand_total)}</td>
      <td style="color:var(--text-muted);font-size:0.82rem;">${formatDate(c.created_at)}</td>
    </tr>
  `).join('');
}

function renderDeptBreakdown(depts) {
  const container = document.getElementById('deptBreakdown');
  if (!depts || depts.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-title">No data yet</div></div>`;
    return;
  }

  const maxTotal = Math.max(...depts.map(d => d.total));

  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-sm);">
    ${depts.map(d => {
      const pct = maxTotal > 0 ? (d.total / maxTotal * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:var(--space-md);">
          <div style="width:120px;font-size:0.85rem;font-weight:600;flex-shrink:0;">${escapeHtml(d.department)}</div>
          <div style="flex:1;background:var(--gray-200);border-radius:var(--radius-full);height:24px;overflow:hidden;">
            <div style="height:100%;background:var(--gradient-primary);border-radius:var(--radius-full);width:${pct}%;transition:width 0.6s ease;display:flex;align-items:center;padding-left:8px;min-width:40px;">
              <span style="font-size:0.72rem;color:#fff;font-weight:700;">${d.count}</span>
            </div>
          </div>
          <div style="width:80px;text-align:right;font-size:0.82rem;font-weight:600;color:var(--primary-600);">${formatCurrency(d.total)}</div>
        </div>
      `;
    }).join('')}
  </div>`;
}

async function loadAuditLog() {
  try {
    const res = await apiFetch('/api/admin/audit-log?limit=10');
    if (!res || !res.ok) return;
    const data = await res.json();

    const tbody = document.getElementById('auditLogBody');
    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No activity yet</td></tr>`;
      return;
    }

    tbody.innerHTML = data.logs.map(log => {
      let changes = '';
      try {
        const c = JSON.parse(log.changes || '{}');
        if (log.action === 'deleted') {
          changes = `${c.staff_name || ''} — ${formatCurrency(c.grand_total || 0)}`;
        } else if (log.action === 'created') {
          changes = `${c.staff_name || ''} — ${formatCurrency(c.grand_total || 0)}`;
        } else {
          const fields = Object.keys(c);
          changes = fields.slice(0, 3).map(f => `${f}: ${c[f].from} → ${c[f].to}`).join(', ');
          if (fields.length > 3) changes += ` +${fields.length - 3} more`;
        }
      } catch (e) { changes = '-'; }

      return `
        <tr>
          <td><span class="audit-action ${log.action}">${log.action}</span></td>
          <td><span class="badge badge-primary">${escapeHtml(log.claim_number || '-')}</span></td>
          <td>${escapeHtml(log.admin_name || '-')}</td>
          <td style="font-size:0.78rem;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(changes)}">${escapeHtml(changes)}</td>
          <td style="font-size:0.78rem;color:var(--text-muted);">${formatDateTime(log.timestamp)}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

async function logout() {
  sessionStorage.setItem('logged_out', 'true');
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  window.location.href = '/admin';
}
