const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const requireAuth = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Trust the first proxy hop so rate limiting keys on the real client IP
// rather than the proxy's, if the API is ever put behind one.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));

// A CRUD payload is a few hundred bytes; anything near this is not legitimate.
app.use(express.json({ limit: '100kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api', apiLimiter);

// Liveness probe, also handy for confirming the API is reachable.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

// Everything below this point requires a valid token.
app.use('/api/departments', requireAuth, departmentRoutes);
app.use('/api/employees', requireAuth, employeeRoutes);
app.use('/api/reports', requireAuth, reportRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
