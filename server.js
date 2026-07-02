/**
 * APRIL MAY Remuneration Claim Management System
 * Main Express Server Entry Point
 * 
 * Serves the public claim form and admin dashboard.
 * API routes handle claims CRUD, authentication, and Excel export.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./database/init');
const authRoutes = require('./backend/routes/auth');
const claimsRoutes = require('./backend/routes/claims');
const adminRoutes = require('./backend/routes/admin');
const exportRoutes = require('./backend/routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Security ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    }
  }
}));

// Rate limit login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Middleware ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Static Files ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/export', exportRoutes);

// ── Page Routes ─────────────────────────────────────────────────────
// Serve the public claim form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Serve admin pages
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'dashboard.html'));
});
app.get('/admin/claims', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'claims.html'));
});
app.get('/admin/claim/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'claim-detail.html'));
});

// ── 404 Handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ────────────────────────────────────────────────────
async function start() {
  try {
    // Initialize database and seed admin account
    initDatabase();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      console.log(`\n🚀 APRIL MAY Remuneration Claim System`);
      console.log(`   ➜ Claim Form:  http://localhost:${PORT}`);
      console.log(`   ➜ Admin Panel: http://localhost:${PORT}/admin`);
      console.log(`   ➜ Default Admin: admin / admin123\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
