const { randomUUID } = require('crypto');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function requestLogger(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    const entry = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      userId: req.user?.userId ?? null,
      role: req.user?.role ?? null,
    };

    if (IS_PRODUCTION) {
      console.log(JSON.stringify({ level: res.statusCode >= 500 ? 'error' : 'info', ...entry }));
      return;
    }

    const who = entry.userId ? ` user=${entry.userId}(${entry.role})` : '';
    console.log(
      `${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms` +
        `${who} id=${entry.requestId.slice(0, 8)}`
    );
  });

  next();
}

module.exports = requestLogger;
