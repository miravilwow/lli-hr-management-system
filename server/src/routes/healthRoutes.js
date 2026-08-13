const express = require('express');

// Referenced through the module rather than destructured so the failure
// path can be exercised in tests.
const db = require('../config/db');

const router = express.Router();

/**
 * Readiness - the API can actually do its job.
 *
 * This check previously returned a static object, so it reported healthy
 * while the database was unreachable and every real request was failing.
 * It now proves the connection before saying so.
 */
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

/**
 * Liveness - the process is up and serving HTTP.
 * Deliberately does not touch the database: a failing dependency should
 * not cause an orchestrator to restart an otherwise healthy process.
 */
function liveness(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

router.get('/', readiness);
router.get('/ready', readiness);
router.get('/live', liveness);

module.exports = router;
