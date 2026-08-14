const express      = require('express');
const cookieParser = require('cookie-parser');
const session      = require('express-session');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
require('dotenv').config();

const authRoutes          = require('./routes/auth');
const recommendationRoutes= require('./routes/recommendations');
const adminRoutes         = require('./routes/admin');
const spotifyRoutes       = require('./routes/spotify');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 1. Security headers ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── 2. CORS ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
];

if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
  const cors = require('cors');
  app.use(cors({
    origin:      process.env.FRONTEND_URL,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.options('*', cors());
}

// ── 3. Rate limiter (API only) ───────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message:  'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// ── 4. Body parsers & Cookie parser ──────────────────────────

//  turns requests into req.body and req.cookies
app.use(express.json()); // middleware that translates those numbers of bytes into JSON objects(dictionary structure) so you can just type req.body.username or req.body.password
app.use(express.urlencoded({ extended: true }));//for old-school HTML form submissions
app.use(cookieParser());

// ── 5. Session ───────────────────────────────────────────────
// express-session package generates a random unique sessionID per user
// sessionID gets signed with the SESSION_SECRET
// SESSION_SECRET: signature = HMAC(sessionID, secret). The cookie sent to the browser is sessionID + '.' + signature.
app.use(session({
  secret:            process.env.SESSION_SECRET || 'weathify-dev-secret-change-me', // used to sign the sessionID cookie so server can detect if cookie has been tampered with
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // FIX 1: secure:true on http:// causes the browser to silently
    // discard the cookie entirely. It never gets stored. This is why
    // Cookies received: [] — the Set-Cookie header is ignored.
    secure: process.env.NODE_ENV === 'production',

    // FIX 2: 'strict' blocks the cookie on the Spotify→localhost redirect
    // because that redirect is a cross-site navigation. 'lax' allows it.
    sameSite: 'lax',

    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  },
}));

// ── 7. Static files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── 8. Routes ────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/recommendations', recommendationRoutes);  // handles /api/recommendations/*
app.use('/api/admin', adminRoutes);                    //modified
app.use('/api/spotify', spotifyRoutes);               //modified
app.use('/api', recommendationRoutes);                  // ALSO mount at /api/* for /api/playlist



// Spotify OAuth callback (Spotify redirects to /callback at root)
const { spotifyCallback } = require('./routes/spotify');
app.get('/callback', spotifyCallback);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// STATIC HTML PAGES — Specific routes for auth pages
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// CATCH-ALL — LAST, for SPA root and 404s
app.get('*', (req, res) => {
  // For API routes that weren't matched, return 404 JSON instead of HTML
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  // For all other routes, serve index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── 10. Error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── 11. Start server ─────────────────────────────────────────
// We assign the listener to a variable called 'server' 
// so we can close it properly later.
const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║                                       ║
  ║   🎵 Weathify Server Running 🎵       ║
  ║                                       ║
  ║   Port: ${PORT}                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;