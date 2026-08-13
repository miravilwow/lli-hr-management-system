const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const requireAuth = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

// Liveness probe, also handy for confirming the API is reachable.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

// Everything below this point requires a valid token.
app.use('/api/departments', requireAuth, departmentRoutes);
app.use('/api/employees', requireAuth, employeeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
