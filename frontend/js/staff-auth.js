/**
 * Staff Auth Logic
 * 
 * Handles staff registration and login forms.
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('staffLoginForm');
  const registerForm = document.getElementById('staffRegisterForm');
  
  if (loginForm) {
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    // Check if already authenticated (skip if explicitly logged out)
    if (sessionStorage.getItem('logged_out') !== 'true') {
      checkStaffAuth();
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';

      const staff_id = document.getElementById('staffId').value.trim();
      const password = document.getElementById('password').value;

      if (!staff_id || !password) {
        showError(loginError, 'Please enter both Staff ID and password');
        return;
      }

      loginBtn.classList.add('loading');
      loginBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/staff/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ staff_id, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          showError(loginError, data.error || 'Invalid credentials');
          return;
        }

        sessionStorage.removeItem('logged_out');
        window.location.href = '/';

      } catch (err) {
        showError(loginError, 'Connection failed. Please try again.');
      } finally {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
      }
    });
  }

  if (registerForm) {
    const registerBtn = document.getElementById('registerBtn');
    const registerError = document.getElementById('registerError');

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      registerError.style.display = 'none';

      const staff_id = document.getElementById('staffId').value.trim();
      const staff_name = document.getElementById('staffName').value.trim();
      const department = document.getElementById('department').value.trim();
      const staff_type = document.querySelector('input[name="staffType"]:checked')?.value;
      const password = document.getElementById('password').value;
      const confirm_password = document.getElementById('confirmPassword').value;

      if (password !== confirm_password) {
        showError(registerError, 'Passwords do not match');
        return;
      }

      registerBtn.classList.add('loading');
      registerBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/staff/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ staff_id, staff_name, department, staff_type, password, confirm_password }),
        });

        const data = await res.json();

        if (!res.ok) {
          showError(registerError, data.error || 'Failed to register');
          return;
        }

        sessionStorage.removeItem('logged_out');
        window.location.href = '/';

      } catch (err) {
        showError(registerError, 'Connection failed. Please try again.');
      } finally {
        registerBtn.classList.remove('loading');
        registerBtn.disabled = false;
      }
    });
  }

  function showError(el, msg) {
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  async function checkStaffAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data.role === 'staff' || data.role === 'admin') {
          window.location.href = '/';
        }
      }
    } catch (err) {
      // Not authenticated
    }
  }
});
