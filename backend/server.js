require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const express = require('express');
// Express 4's router does NOT forward rejected promises from async route handlers to
// the error middleware — an unhandled rejection (e.g. a Mongoose validation error on
// save()) just leaves the request hanging with no response, which surfaces in the
// browser as a generic "failed to fetch" / network error with no useful message. This
// patches every route handler registered after this line so thrown/rejected errors are
// always forwarded to next(err) and answered by the central error handler below.
require('express-async-errors');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const parcelRoutes = require('./routes/parcels');
const applicationRoutes = require('./routes/applications');
const landUseRoutes = require('./routes/landUses');
const adminRoutes = require('./routes/admin');
const wishlistRoutes = require('./routes/wishlist');
const waitlistRoutes = require('./routes/waitlist');
const paymentRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chat');
const realtime = require('./services/realtime');
const User = require('./models/User');

const app = express();

app.use(helmet());
// Gzip/brotli-negotiated compression for every JSON response — the marketplace list
// and parcel detail payloads (photos arrays, productivity reports, etc.) are the
// biggest responses this API sends, so this is a straightforward win for load time
// on slower connections. Skipped automatically for tiny responses (below the default
// 1kb threshold) where compressing would cost more than it saves.
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// Trailing slashes are an easy way for CORS_ORIGINS to silently stop matching (an env
// var of "https://app.example.com/" will never equal the browser's Origin header,
// which never includes a trailing slash) — normalize both sides so that mismatch can't
// quietly turn into every admin request failing as a CORS-blocked "failed to fetch".
const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (e.g. curl, server-to-server) with no origin header.
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// General API rate limit to blunt abuse/scraping. Login has its own tighter limit.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/parcels', parcelRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/land-uses', landUseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/waitlist', waitlistRoutes);
// M-Pesa STK push init/status live under /api/payments; the callback sub-route
// (/api/payments/mpesa/callback) is intentionally left open — see routes/payments.js.
app.use('/api/payments', paymentRoutes);
// Live chat between a farmer and a landowner about a specific parcel. REST here
// handles history/create; realtime delivery goes over the Socket.io server set up
// below (see services/realtime.js).
app.use('/api/chat', chatRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler — keeps stack traces out of API responses, and now that
// express-async-errors forwards every rejected promise here, this is what turns a
// Mongoose save() failure into a real JSON error the admin editor can display instead
// of a hung request that looks like "failed to fetch" in the browser.
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (err.name === 'ValidationError') {
    const firstField = Object.values(err.errors || {})[0];
    return res.status(400).json({ error: firstField ? firstField.message : 'Validation failed' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${err.path}` });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That request was too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed request body' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

// Wrap the Express app in a plain http.Server so Socket.io (live chat) can share
// the same port — no separate process or port to deploy/manage.
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});
realtime.init(io);

// Every socket authenticates with the same JWT the REST API uses (sent as
// `auth: { token }` from the client), so chat never needs a separate login. A
// socket that fails to authenticate is simply refused — the rest of the app
// (and REST-based chat history) keeps working with no realtime push, same as if
// live chat were never configured.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Not authenticated'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('_id role');
    if (!user) return next(new Error('Not authenticated'));
    socket.userId = String(user._id);
    next();
  } catch (err) {
    next(new Error('Not authenticated'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  realtime.markOnline(socket.userId);

  // Client joins the room for whichever conversation thread it currently has open,
  // so chat:message events only reach people actually viewing that thread (in
  // addition to the always-on user:<id> room used for unread badges).
  socket.on('chat:join', (conversationId) => {
    if (conversationId) socket.join(`conversation:${conversationId}`);
  });
  socket.on('chat:leave', (conversationId) => {
    if (conversationId) socket.leave(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    realtime.markOffline(socket.userId);
  });
});

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => console.log(`Landora API (+ live chat) listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
