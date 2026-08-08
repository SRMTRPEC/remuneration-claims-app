/**
 * Auth Logic
 * 
 * Handles admin login form submission.
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');

  // Check if already authenticated (skip if user explicitly logged out)
  if (sessionStorage.getItem('logged_out') !== 'true') {
    checkAuth();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showError('Please enter both username and password');
      return;
    }

    loginBtn.classList.add('loading');
    loginBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Invalid credentials');
        return;
      }

      // Clear logged out flag since they logged in successfully
      sessionStorage.removeItem('logged_out');

      // Redirect to dashboard
      window.location.href = '/admin/dashboard';

    } catch (err) {
      showError('Connection failed. Please try again.');
    } finally {
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
    }
  });

  function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data.role === 'admin') window.location.href = '/admin/dashboard';
      }
    } catch (err) {
      // Not authenticated — stay on login
    }
  }
});
