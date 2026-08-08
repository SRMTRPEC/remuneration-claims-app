/**
 * Shared Utilities
 * 
 * Toast notifications, modal dialogs, formatters, and dark mode toggle.
 */

// ── Toast Notification System ───────────────────────────────────────

function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - Optional title
 * @param {number} duration - Auto-dismiss in ms (default 4000)
 */
function showToast(message, type = 'info', title = '', duration = 4000) {
  initToastContainer();
  const container = document.querySelector('.toast-container');

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const titles = {
    success: title || 'Success',
    error: title || 'Error',
    warning: title || 'Warning',
    info: title || 'Info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-content">
      <div class="toast-title">${titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="dismissToast(this.parentElement)">✕</button>
  `;

  container.appendChild(toast);

  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }

  return toast;
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('hiding')) return;
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 300);
}

// ── Confirmation Modal ──────────────────────────────────────────────

function showConfirmDialog(title, message, onConfirm, onCancel) {
  // Remove existing modal if any
  const existing = document.querySelector('.modal-overlay.confirm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay confirm-modal';
  overlay.innerHTML = `
    <div class="modal">
      <h3 class="modal-title">${title}</h3>
      <div class="modal-body">${message}</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-danger" id="modal-confirm">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  overlay.querySelector('#modal-cancel').addEventListener('click', () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
    if (onCancel) onCancel();
  });

  overlay.querySelector('#modal-confirm').addEventListener('click', () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
    if (onConfirm) onConfirm();
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      if (onCancel) onCancel();
    }
  });
}

// ── Dark Mode Toggle ────────────────────────────────────────────────

function initDarkMode() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// ── Number to Words (Indian Rupees) — Client-side ───────────────────

const _ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const _tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function _numToWords(num) {
  if (num === 0) return '';
  if (num < 20) return _ones[num];
  if (num < 100) return _tens[Math.floor(num / 10)] + (num % 10 ? ' ' + _ones[num % 10] : '');
  if (num < 1000) return _ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + _numToWords(num % 100) : '');
  if (num < 100000) return _numToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + _numToWords(num % 1000) : '');
  if (num < 10000000) return _numToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + _numToWords(num % 100000) : '');
  return _numToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + _numToWords(num % 10000000) : '');
}

function numberToWords(amount) {
  if (!amount || amount === 0) return 'Rupees Zero Only';
  const rupees = Math.floor(amount);
  let words = 'Rupees ' + _numToWords(rupees);
  words += ' Only';
  return words;
}

// ── Currency Formatter ──────────────────────────────────────────────

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCurrencyDecimal(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Date Formatter ──────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── API Helper ──────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin', // Include cookies
  };

  const config = { ...defaults, ...options };
  if (options.headers) {
    config.headers = { ...defaults.headers, ...options.headers };
  }

  const response = await fetch(url, config);

  if (response.status === 401) {
    // Redirect to login on auth failure
    if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin') {
      window.location.href = '/admin';
      return null;
    }
  }

  return response;
}

// ── Session ID for drafts ───────────────────────────────────────────

function getSessionId() {
  let sid = sessionStorage.getItem('claim_session_id');
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('claim_session_id', sid);
  }
  return sid;
}

// ── Escape HTML ─────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── QP Type Label ───────────────────────────────────────────────────

function qpTypeLabel(type) {
  const map = {
    'qp_with_answer_key': 'QP Setting with Answer Key',
    'qp_only': 'Question Paper Only',
    'answer_key_only': 'Answer Key Only'
  };
  return map[type] || '-';
}

// ── Print Formatting Helpers ────────────────────────────────────────

function formatEvalPhasePrint(c) {
  let str = c.eval_phase;
  if (!str) return '-';
  if (typeof str === 'string' && str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) {
        return arr.map(s => `<strong>${s.phase}</strong>: ${s.appointment || '-'} | ${s.date || '-'}`).join('<br>');
      }
    } catch(e) {}
  }
  return `${escapeHtml(c.eval_appointment || '-')} | ${escapeHtml(c.eval_phase || '-')} | ${escapeHtml(c.eval_date || '-')}`;
}

function formatSquadSessionPrint(c) {
  let str = c.squad_session || c.squad_sessions;
  if (typeof str === 'object' && str !== null) {
    return Object.entries(str).filter(([_, count]) => count > 0).map(([s, count]) => `${count}x ${s}`).join(', ') || '-';
  }
  if (typeof str === 'string' && str.startsWith('{')) {
    try {
      const obj = JSON.parse(str);
      const parts = [];
      if (obj.Forenoon) parts.push(`${obj.Forenoon}x Forenoon`);
      if (obj.Afternoon) parts.push(`${obj.Afternoon}x Afternoon`);
      if (obj["Both Sessions"]) parts.push(`${obj["Both Sessions"]}x Both Sessions`);
      if (parts.length > 0) return parts.join(', ');
    } catch(e) {}
  }
  return escapeHtml(str || '-');
}

// ── Initialize dark mode on every page ──────────────────────────────
document.addEventListener('DOMContentLoaded', initDarkMode);
