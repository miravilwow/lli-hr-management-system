const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const requestLogger = require('./middleware/requestLogger');
const requireAuth = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const healthRoutes = require('./routes/healthRoutes');
const reportRoutes = require('./routes/reportRoutes');

const V1 = '/api/v1';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));

app.use(express.json({ limit: '100kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);

app.use(`${V1}/auth`, authRoutes);

app.use(`${V1}/departments`, requireAuth, departmentRoutes);
app.use(`${V1}/employees`, requireAuth, employeeRoutes);
app.use(`${V1}/reports`, requireAuth, reportRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
