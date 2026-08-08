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

  // Static Buttons
  document.getElementById('btnAddStaff')?.addEventListener('click', () => openModal('staffModal'));
  document.getElementById('btnAddAdmin')?.addEventListener('click', () => openModal('adminModal'));
  document.getElementById('togglePasswordVisibility')?.addEventListener('change', (e) => {
    document.getElementById('adminNewPassword').type = e.target.checked ? 'text' : 'password';
    document.getElementById('adminConfirmPassword').type = e.target.checked ? 'text' : 'password';
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-close'));
    });
  });

  // Table Event Delegation (Staff)
  document.querySelector('#staffTable').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-view-staff')) {
      viewStaff(btn.dataset.id);
    } else if (btn.classList.contains('btn-edit-staff')) {
      editStaff(btn.dataset.id);
    } else if (btn.classList.contains('btn-delete-staff')) {
      deleteUser(btn.dataset.id, btn.dataset.type, btn.dataset.name);
    }
  });

  // Table Event Delegation (Admin)
  document.querySelector('#adminTable').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-delete-admin')) {
      deleteUser(btn.dataset.id, btn.dataset.type, btn.dataset.name);
    }
  });

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
    
    // Combine salutation, name, and initial
    const salutation = data.staff_salutation || '';
    const givenName = data.staff_name ? data.staff_name.trim() : '';
    let initial = data.staff_initial ? data.staff_initial.trim().toUpperCase() : '';
    
    // Strip any dots or commas the user might have accidentally entered in the initial field
    initial = initial.replace(/[.,\s]+/g, '');
    
    data.staff_name = `${salutation} ${givenName}${initial ? ' ' + initial + '.' : ''}`.trim();
    
    delete data.staff_salutation;
    delete data.staff_initial;

    if (data.designation === 'Others') {
      data.designation = data.otherDesignation || '';
    }
    delete data.otherDesignation;

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

  // Handle Edit Staff Form
  document.getElementById('editStaffForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    document.getElementById('editStaffFormError').style.display = 'none';

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const id = data.id;
    delete data.id;

    if (data.designation === 'Others') {
      data.designation = data.otherDesignation || '';
    }
    delete data.otherDesignation;

    try {
      const res = await apiFetch(`/api/admin/users/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update staff account');
      
      closeModal('editStaffModal');
      showToast('Staff account updated successfully', 'success');
      fetchStaff();
    } catch (err) {
      const errorDiv = document.getElementById('editStaffFormError');
      errorDiv.textContent = err.message || 'Failed to update staff account';
      errorDiv.style.display = 'block';
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});

let allStaffData = []; // Store fetched staff globally for easy editing

async function fetchStaff() {
  const tbody = document.querySelector('#staffTable tbody');
  try {
    const res = await apiFetch('/api/admin/users/staff');
    if (!res || !res.ok) throw new Error('Failed to fetch staff');
    const data = await res.json();
    
    allStaffData = data.staff || [];

    if (allStaffData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">No staff accounts found.</td></tr>';
      return;
    }

    let userMap = window.userMap || {};
    
    tbody.innerHTML = allStaffData.map(s => {
      const searchKey = `Staff: ${s.staff_id} - ${s.staff_name}`;
      userMap[searchKey] = { id: s.id, type: 'staff' };
      return `
      <tr>
        <td><strong>${escapeHtml(s.staff_id)}</strong></td>
        <td>${escapeHtml(s.staff_name)}</td>
        <td><span class="badge ${s.staff_type === 'External' ? 'badge-warning' : 'badge-primary'}">${escapeHtml(s.staff_type || 'Internal')}</span></td>
        <td><span class="badge badge-outline">${escapeHtml(s.department)}</span></td>
        <td>${escapeHtml(s.designation || '')}</td>
        <td>${new Date(s.created_at).toLocaleDateString()}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-sm btn-view-staff" data-id="${s.id}" style="color: var(--text-primary); padding: 0.25rem 0.5rem; background: transparent; border: none; margin-right: 0.25rem;" title="View Details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="btn btn-sm btn-edit-staff" data-id="${s.id}" style="color: var(--primary-color); padding: 0.25rem 0.5rem; background: transparent; border: none; margin-right: 0.25rem;" title="Edit Details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button class="btn btn-sm btn-delete-staff" data-id="${s.id}" data-type="staff" data-name="${escapeHtml(s.staff_name)}" style="color: var(--danger-color); padding: 0.25rem 0.5rem; background: transparent; border: none;" title="Delete Staff">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </td>
      </tr>
      `;
    }).join('');
    
    window.userMap = userMap;
    updateUserDatalist();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger-color);padding:2rem;">Failed to load staff.</td></tr>';
  }
}

async function fetchAdmins() {
  const tbody = document.querySelector('#adminTable tbody');
  try {
    const res = await apiFetch('/api/admin/users/admins');
    if (!res || !res.ok) throw new Error('Failed to fetch admins');
    const data = await res.json();
    
    if (!data.admins || data.admins.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;">No admin profiles found.</td></tr>';
      return;
    }

    let userMap = window.userMap || {};

    tbody.innerHTML = data.admins.map(a => {
      const searchKey = `Admin: ${a.username}`;
      userMap[searchKey] = { id: a.id, type: 'admin' };
      return `
      <tr>
        <td><strong>${escapeHtml(a.username)}</strong></td>
        <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
        <td style="text-align: center;">
          <button class="btn btn-sm btn-delete-admin" data-id="${a.id}" data-type="admin" data-name="${escapeHtml(a.username)}" style="color: var(--danger-color); padding: 0.25rem 0.5rem; background: transparent; border: none;" title="Delete Admin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </td>
      </tr>
      `;
    }).join('');
    
    window.userMap = userMap;
    updateUserDatalist();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--danger-color);padding:2rem;">Failed to load admins.</td></tr>';
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function viewStaff(id) {
  const staff = allStaffData.find(s => s.id == id);
  if (!staff) return;
  
  document.getElementById('viewStaffId').textContent = staff.staff_id || '-';
  document.getElementById('viewStaffName').textContent = staff.staff_name || '-';
  document.getElementById('viewStaffType').textContent = staff.staff_type || 'Internal';
  document.getElementById('viewDepartment').textContent = staff.department || '-';
  document.getElementById('viewDesignation').textContent = staff.designation || '-';
  
  openModal('viewStaffModal');
}

function editStaff(id) {
  const staff = allStaffData.find(s => s.id == id);
  if (!staff) return;
  
  document.getElementById('editStaffDbId').value = staff.id;
  document.getElementById('editStaffId').value = staff.staff_id;
  document.getElementById('editStaffName').value = staff.staff_name;
  document.getElementById('editStaffType').value = staff.staff_type || 'Internal';
  document.getElementById('editDepartment').value = staff.department || '';
  
  const standardDesignations = ['Professor', 'Associate Professor', 'Assistant Professor'];
  if (staff.designation && !standardDesignations.includes(staff.designation)) {
    document.getElementById('editDesignation').value = 'Others';
    document.getElementById('editOtherDesignation').value = staff.designation;
    document.getElementById('editOtherDesignationDiv').style.display = 'block';
  } else {
    document.getElementById('editDesignation').value = staff.designation || '';
    document.getElementById('editOtherDesignation').value = '';
    document.getElementById('editOtherDesignationDiv').style.display = 'none';
  }
  
  openModal('editStaffModal');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.getElementById(id + 'Error') && (document.getElementById(id + 'Error').style.display = 'none');
  const form = document.querySelector(`#${id} form`);
  if (form) form.reset();
}

function updateUserDatalist() {
  const searchInput = document.getElementById('passwordSearch');
  const dropdown = document.getElementById('userDropdown');
  if (!dropdown || !searchInput || !window.userMap) return;
  
  const keys = Object.keys(window.userMap);
  
  const renderOptions = (filter = '') => {
    const f = filter.toLowerCase();
    const filtered = keys.filter(k => k.toLowerCase().includes(f));
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div style="padding:0.75rem 1rem; color:var(--text-muted);">No users found</div>';
      return;
    }
    dropdown.innerHTML = filtered.map(k => `<div class="dropdown-option" data-value="${escapeHtml(k)}">${escapeHtml(k)}</div>`).join('');
    
    // Add click listeners to options
    dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
      opt.addEventListener('click', () => {
        searchInput.value = opt.dataset.value;
        document.getElementById('passwordSearchHidden').value = opt.dataset.value;
        dropdown.style.display = 'none';
      });
    });
  };

  // Initial render
  renderOptions();

  // Search filter
  searchInput.addEventListener('input', (e) => {
    document.getElementById('passwordSearchHidden').value = ''; // clear hidden value if typing
    dropdown.style.display = 'block';
    renderOptions(e.target.value);
  });

  // Show dropdown on click
  searchInput.addEventListener('click', () => {
    dropdown.style.display = 'block';
    if (!searchInput.value) {
      renderOptions(''); // Show all if empty
    } else {
      renderOptions(searchInput.value);
    }
  });

  // Show dropdown on focus
  searchInput.addEventListener('focus', () => {
    dropdown.style.display = 'block';
    if (!searchInput.value) {
      renderOptions('');
    } else {
      renderOptions(searchInput.value);
    }
  });

  // Hide dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
      // Auto-select if exact match is typed
      const typed = searchInput.value;
      if (window.userMap[typed]) {
        document.getElementById('passwordSearchHidden').value = typed;
      }
    }
  });
}

// Handle Change Password Form
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const originalText = btn.textContent;
  btn.textContent = 'Updating...';
  btn.disabled = true;
  
  const errorDiv = document.getElementById('changePasswordFormError');
  errorDiv.style.display = 'none';

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  const newPassword = (data.new_password || '').trim();
  const confirmPassword = (data.confirm_password || '').trim();

  if (newPassword !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match';
    errorDiv.style.display = 'block';
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }
  
  const searchInput = document.getElementById('passwordSearchHidden').value || document.getElementById('passwordSearch').value;
  const user = window.userMap ? window.userMap[searchInput] : null;
  
  if (!user) {
    errorDiv.textContent = 'Please select a valid user from the dropdown search.';
    errorDiv.style.display = 'block';
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  const endpoint = user.type === 'staff' 
    ? `/api/admin/users/staff/${user.id}/password` 
    : `/api/admin/users/admins/${user.id}/password`;

  try {
    const res = await apiFetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Failed to update password');
    
    e.target.reset();
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

async function deleteUser(id, type, name) {
  if (!confirm(`Are you sure you want to completely delete the ${type} profile for "${name}"?\nThis action cannot be undone.`)) {
    return;
  }
  
  try {
    const endpointPath = type === 'staff' ? 'staff' : 'admins';
    const res = await apiFetch(`/api/admin/users/${endpointPath}/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || `Failed to delete ${type}`);
    
    showToast(`Successfully deleted ${name}`, 'success');
    
    // Refresh tables
    if (type === 'staff') {
      fetchStaff();
    } else {
      fetchAdmins();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
