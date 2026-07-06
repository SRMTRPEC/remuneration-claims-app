/**
 * Authentication Routes
 * 
 * Handles admin login, logout, and session verification.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const { generateToken, generateStaffToken, requireAdmin, requireStaff, verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Admin login with username and password
 */
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    const password = (req.body.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = bcrypt.compareSync(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(admin);

    // Set httpOnly cookie (session cookie, clears when browser closes)
    res.cookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Clear the auth cookie
 */
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    path: '/',
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Get current user info (admin or staff)
 */
router.get('/me', verifyToken, (req, res) => {
  if (req.admin) {
    res.json({ role: 'admin', user: req.admin });
  } else if (req.staff) {
    res.json({ role: 'staff', user: req.staff });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// ==========================================
// STAFF AUTHENTICATION
// ==========================================

/**
 * POST /api/auth/staff/register
 */
router.post('/staff/register', async (req, res) => {
  try {
    const { staff_id, staff_name, department } = req.body;
    const password = (req.body.password || '').trim();
    const confirm_password = (req.body.confirm_password || '').trim();

    if (!staff_id || !staff_name || !department || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Format staff ID safely
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

    // Create staff
    const password_hash = bcrypt.hashSync(password, 10);
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert([{
        staff_id: cleanStaffId,
        staff_name: staff_name.trim(),
        department: department.trim(),
        password_hash
      }])
      .select()
      .single();

    if (error) throw error;

    const token = generateStaffToken(newStaff);
    res.cookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ success: true, staff: { id: newStaff.id, staff_id: newStaff.staff_id, staff_name: newStaff.staff_name } });
  } catch (err) {
    console.error('Staff register error:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

/**
 * POST /api/auth/staff/login
 */
router.post('/staff/login', async (req, res) => {
  try {
    const { staff_id } = req.body;
    const password = (req.body.password || '').trim();

    if (!staff_id || !password) {
      return res.status(400).json({ error: 'Staff ID and password required' });
    }

    const cleanStaffId = 'TRPT' + staff_id.replace(/^TRPT/i, '').trim();

    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('staff_id', cleanStaffId)
      .single();

    if (error || !staff) {
      return res.status(401).json({ error: 'Invalid Staff ID or Password' });
    }

    const isValid = bcrypt.compareSync(password, staff.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Staff ID or Password' });
    }

    const token = generateStaffToken(staff);
    res.cookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ success: true, staff: { id: staff.id, staff_id: staff.staff_id, staff_name: staff.staff_name } });
  } catch (err) {
    console.error('Staff login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
