/**
 * Admin Routes
 * 
 * Dashboard stats and audit log viewing.
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/auth');

// All admin routes require authentication
router.use(requireAdmin);

/**
 * GET /api/admin/audit-log
 * Get the audit trail with pagination
 */
router.get('/audit-log', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { data: logs, count, error } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/admin/departments
 * Get list of unique departments for filter dropdowns
 */
router.get('/departments', async (req, res) => {
  try {
    // Supabase JS doesn't have a DISTINCT function natively without RPC.
    // So we fetch all distinct departments. If there are too many, we should use RPC.
    // For now, fetch all claims' departments and deduplicate in node.
    const { data, error } = await supabase
      .from('remuneration_claims')
      .select('department');

    if (error) throw error;

    const uniqueDepartments = [...new Set(data.map(d => d.department))].filter(Boolean).sort();

    res.json({ departments: uniqueDepartments });
  } catch (err) {
    console.error('Departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

/**
 * GET /api/admin/users/staff
 * List all staff accounts
 */
router.get('/users/staff', async (req, res) => {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, staff_id, staff_name, department, staff_type, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ staff });
  } catch (err) {
    console.error('Fetch staff error:', err);
    res.status(500).json({ error: 'Failed to fetch staff accounts' });
  }
});

/**
 * POST /api/admin/users/staff
 * Create a new staff account
 */
router.post('/users/staff', async (req, res) => {
  try {
    const { staff_id, staff_name, department, staff_type, password } = req.body;

    if (!staff_id || !staff_name || !department || !staff_type || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanStaffId = 'TRPT' + staff_id.replace(/^TRPT/i, '').trim();

    // Check if exists
    const { data: existing, error: checkErr } = await supabase
      .from('staff')
      .select('id')
      .eq('staff_id', cleanStaffId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Staff ID is already registered' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert([{
        staff_id: cleanStaffId,
        staff_name: staff_name.trim(),
        department: department.trim(),
        staff_type: staff_type,
        password_hash
      }])
      .select('id, staff_id, staff_name, department, staff_type, created_at')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, staff: newStaff });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Failed to create staff account' });
  }
});

/**
 * GET /api/admin/users/admins
 * List all admin profiles
 */
router.get('/users/admins', async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('admins')
      .select('id, username, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ admins });
  } catch (err) {
    console.error('Fetch admins error:', err);
    res.status(500).json({ error: 'Failed to fetch admin profiles' });
  }
});

/**
 * POST /api/admin/users/admins
 * Create a new admin profile
 */
router.post('/users/admins', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if exists
    const { data: existing, error: checkErr } = await supabase
      .from('admins')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Admin username is already taken' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const { data: newAdmin, error } = await supabase
      .from('admins')
      .insert([{
        username: username.trim(),
        full_name: null,
        password_hash
      }])
      .select('id, username, created_at')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, admin: newAdmin });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Failed to create admin profile' });
  }
});

/**
 * PUT /api/admin/users/staff/:id/password
 * Admin changes a staff member's password
 */
router.put('/users/staff/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const rawPassword = req.body.password || '';
    const password = rawPassword.trim();

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get old password hash to check if it's the same
    const { data: staff, error: fetchErr } = await supabase
      .from('staff')
      .select('password_hash')
      .eq('id', id)
      .single();

    if (fetchErr || !staff) {
      return res.status(404).json({ error: 'Staff account not found' });
    }

    if (bcrypt.compareSync(password, staff.password_hash)) {
      return res.status(400).json({ error: 'New password must be different from the old password' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const { error: updateErr } = await supabase
      .from('staff')
      .update({ password_hash })
      .eq('id', id);

    if (updateErr) throw updateErr;
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Staff password update error:', err);
    res.status(500).json({ error: 'Failed to update staff password' });
  }
});

/**
 * PUT /api/admin/users/admins/:id/password
 * Admin changes an admin's password
 */
router.put('/users/admins/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const rawPassword = req.body.password || '';
    const password = rawPassword.trim();

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get old password hash to check if it's the same
    const { data: admin, error: fetchErr } = await supabase
      .from('admins')
      .select('password_hash')
      .eq('id', id)
      .single();

    if (fetchErr || !admin) {
      return res.status(404).json({ error: 'Admin profile not found' });
    }

    if (bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(400).json({ error: 'New password must be different from the old password' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const { error: updateErr } = await supabase
      .from('admins')
      .update({ password_hash })
      .eq('id', id);

    if (updateErr) throw updateErr;
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Admin password update error:', err);
    res.status(500).json({ error: 'Failed to update admin password' });
  }
});

/**
 * DELETE /api/admin/users/staff/:id
 * Delete a staff profile
 */
router.delete('/users/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Staff profile deleted' });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Failed to delete staff profile' });
  }
});

/**
 * DELETE /api/admin/users/admins/:id
 * Delete an admin profile
 */
router.delete('/users/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting the very last admin or the admin themselves? 
    // We'll just allow it for now, or prevent deleting self if req.admin.id === id
    if (req.admin && req.admin.id === id) {
       return res.status(403).json({ error: 'You cannot delete your own admin profile' });
    }
    
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Admin profile deleted' });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Failed to delete admin profile' });
  }
});

module.exports = router;
