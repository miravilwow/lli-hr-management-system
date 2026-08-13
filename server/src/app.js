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
const healthRoutes = require('./routes/healthRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Business routes are versioned so a breaking change has somewhere to go.
const V1 = '/api/v1';

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

// Operational endpoints sit outside the version prefix: they describe the
// process, not the business contract, and monitors should not have to be
// updated when the API version changes.
app.use('/api/health', healthRoutes);

app.use(`${V1}/auth`, authRoutes);

// Everything below this point requires a valid token.
app.use(`${V1}/departments`, requireAuth, departmentRoutes);
app.use(`${V1}/employees`, requireAuth, employeeRoutes);
app.use(`${V1}/reports`, requireAuth, reportRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
