const express = require('express');

const db = require('../config/db');

const router = express.Router();

async function readiness(req, res) {
  const startedAt = Date.now();

  try {
    const pool = await db.getPool();
    await pool.request().query('SELECT 1 AS ok');

    res.json({
      status: 'ok',
      database: { status: 'up', latencyMs: Date.now() - startedAt },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unavailable',
      database: { status: 'down', error: err.message },
      timestamp: new Date().toISOString(),
    });
  }
}

function liveness(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

router.get('/', readiness);
router.get('/ready', readiness);
router.get('/live', liveness);

module.exports = router;
