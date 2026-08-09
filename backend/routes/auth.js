/**
 * Authentication Routes
 * 
 * Handles admin login, logout, and session verification.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const supabase = require('../supabase');
const { generateToken, generateStaffToken, requireAdmin, requireStaff, verifyToken } = require('../middleware/auth');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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
    const { staff_id, staff_name, department, designation, staff_type, email } = req.body;
    const password = (req.body.password || '').trim();
    const confirm_password = (req.body.confirm_password || '').trim();

    if (!staff_id || !staff_name || !department || !designation || !staff_type || !password || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Format staff ID based on staff_type
    const cleanStaffId = staff_type === 'External' 
      ? staff_id.trim() 
      : 'TRPT' + staff_id.replace(/^TRPT/i, '').trim();

    // Check if exists
    const { data: existing, error: checkErr } = await supabase
      .from('staff')
      .select('id')
      .eq('staff_id', cleanStaffId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Staff ID is already registered' });
    }

    // Check if email exists
    const { data: existingEmail } = await supabase
      .from('staff')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Create staff
    const password_hash = bcrypt.hashSync(password, 10);
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert([{
        staff_id: cleanStaffId,
        staff_name: staff_name.trim(),
        department: department.trim(),
        designation: designation.trim(),
        staff_type: staff_type,
        email: email.trim(),
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
    const { staff_id, staff_type } = req.body;
    const password = (req.body.password || '').trim();

    if (!staff_id || !password || !staff_type) {
      return res.status(400).json({ error: 'Staff Type, ID, and Password required' });
    }

    const cleanStaffId = staff_type === 'External'
      ? staff_id.trim()
      : 'TRPT' + staff_id.replace(/^TRPT/i, '').trim();

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

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if user exists
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, staff_name')
      .eq('email', email.trim())
      .single();

    if (error || !staff) {
      // Return success anyway to prevent email enumeration
      return res.json({ success: true, message: 'If this email is registered, a reset link will be sent.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token
    const { error: updateError } = await supabase
      .from('staff')
      .update({ reset_token: hashedToken, reset_token_expires: expiresAt.toISOString() })
      .eq('id', staff.id);

    if (updateError) throw updateError;

    // Send email
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    
    await transporter.sendMail({
      from: `"Remuneration Portal" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h3>Hello ${staff.staff_name},</h3>
        <p>You requested a password reset for the Remuneration Portal.</p>
        <p>Please click the link below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.json({ success: true, message: 'Reset link sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, reset_token_expires')
      .eq('reset_token', hashedToken)
      .single();

    if (error || !staff) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (new Date(staff.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Update password and clear token
    const password_hash = bcrypt.hashSync(password, 10);
    const { error: updateError } = await supabase
      .from('staff')
      .update({ password_hash, reset_token: null, reset_token_expires: null })
      .eq('id', staff.id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
