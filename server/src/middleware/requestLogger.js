const { randomUUID } = require('crypto');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Gives every request an id and logs one line per completed request.
 *
 * Previously the only logging was morgan's dev output, which carries no
 * request id and no user, so a report of "it failed around 3pm" could
 * not be traced to the request that failed. The id is returned in the
 * X-Request-Id header and included in error responses, so a user can
 * quote it and it can be found in the logs.
 */
function requestLogger(req, res, next) {
  // Honour an upstream id if a proxy already assigned one, so a trace
  // survives across hops.
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
      // One JSON object per line, so the logs are queryable.
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
