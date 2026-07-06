document.addEventListener('DOMContentLoaded', async () => {
  // Check Auth
  try {
    const meRes = await apiFetch('/api/auth/me');
    if (!meRes || !meRes.ok) {
      window.location.href = '/admin';
      return;
    }
    const data = await meRes.json();
    if (data.role !== 'admin') {
      window.location.href = '/admin';
      return;
    }
    const me = data.user;
    document.getElementById('userName').textContent = me.fullName || me.username;
    document.getElementById('userAvatar').textContent = (me.fullName || me.username).charAt(0).toUpperCase();
  } catch (err) {
    console.error('Auth check failed', err);
    window.location.href = '/admin';
    return;
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('adminData');
    window.location.href = '/admin';
  });

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });

  // Fetch initial data
  fetchStaff();
  fetchAdmins();

  // Handle Staff Form
  document.getElementById('createStaffForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Creating...';
    btn.disabled = true;
    document.getElementById('staffFormError').style.display = 'none';

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await apiFetch('/api/admin/users/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create staff account');
      
      e.target.reset();
      closeModal('staffModal');
      showToast('Staff account created successfully', 'success');
      fetchStaff();
    } catch (err) {
      const errorDiv = document.getElementById('staffFormError');
      errorDiv.textContent = err.message || 'Failed to create staff account';
      errorDiv.style.display = 'block';
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  // Handle Admin Form
  document.getElementById('createAdminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Creating...';
    btn.disabled = true;
    document.getElementById('adminFormError').style.display = 'none';

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await apiFetch('/api/admin/users/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create admin profile');
      
      e.target.reset();
      closeModal('adminModal');
      showToast('Admin profile created successfully', 'success');
      fetchAdmins();
    } catch (err) {
      const errorDiv = document.getElementById('adminFormError');
      errorDiv.textContent = err.message || 'Failed to create admin profile';
      errorDiv.style.display = 'block';
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});

async function fetchStaff() {
  const tbody = document.querySelector('#staffTable tbody');
  try {
    const res = await apiFetch('/api/admin/users/staff');
    if (!res || !res.ok) throw new Error('Failed to fetch staff');
    const data = await res.json();
    
    if (!data.staff || data.staff.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;">No staff accounts found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.staff.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.staff_id)}</strong></td>
        <td>${escapeHtml(s.staff_name)}</td>
        <td><span class="badge badge-outline">${escapeHtml(s.department)}</span></td>
        <td>${new Date(s.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openChangePasswordModal('${s.id}', 'staff', '${escapeHtml(s.staff_id)} - ${escapeHtml(s.staff_name)}')">Change Password</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger-color);padding:2rem;">Failed to load staff.</td></tr>';
  }
}

async function fetchAdmins() {
  const tbody = document.querySelector('#adminTable tbody');
  try {
    const res = await apiFetch('/api/admin/users/admins');
    if (!res || !res.ok) throw new Error('Failed to fetch admins');
    const data = await res.json();
    
    if (!data.admins || data.admins.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:2rem;">No admin profiles found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.admins.map(a => `
      <tr>
        <td><strong>${escapeHtml(a.username)}</strong></td>
        <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openChangePasswordModal('${a.id}', 'admin', '${escapeHtml(a.username)}')">Change Password</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--danger-color);padding:2rem;">Failed to load admins.</td></tr>';
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.getElementById(id + 'Error') && (document.getElementById(id + 'Error').style.display = 'none');
  const form = document.querySelector(`#${id} form`);
  if (form) form.reset();
}

function openChangePasswordModal(userId, userType, displayUsername) {
  document.getElementById('changePasswordUserId').value = userId;
  document.getElementById('changePasswordUserType').value = userType;
  document.getElementById('changePasswordUsername').textContent = displayUsername;
  document.getElementById('changePasswordFormError').style.display = 'none';
  openModal('changePasswordModal');
}

// Handle Change Password Form
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const originalText = btn.textContent;
  btn.textContent = 'Updating...';
  btn.disabled = true;
  
  const errorDiv = document.getElementById('changePasswordFormError');
  errorDiv.style.display = 'none';

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  if (data.new_password !== data.confirm_password) {
    errorDiv.textContent = 'Passwords do not match';
    errorDiv.style.display = 'block';
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  const endpoint = data.user_type === 'staff' 
    ? `/api/admin/users/staff/${data.user_id}/password` 
    : `/api/admin/users/admins/${data.user_id}/password`;

  try {
    const res = await apiFetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: data.new_password })
    });
    
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Failed to update password');
    
    e.target.reset();
    closeModal('changePasswordModal');
    showToast('Password updated successfully', 'success');
  } catch (err) {
    errorDiv.textContent = err.message || 'Failed to update password';
    errorDiv.style.display = 'block';
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// Ensure modals close when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});
