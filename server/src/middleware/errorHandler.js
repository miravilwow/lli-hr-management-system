/**
 * Error thrown deliberately by the application layer, carrying the HTTP
 * status the client should see. Anything else is treated as a 500.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    // Tie the stack to the request id so a user's report can be traced to
    // the exact failure, even though the response deliberately says little.
    console.error(
      JSON.stringify({
        level: 'error',
        requestId: req.id ?? null,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.userId ?? null,
        message: err.message,
        stack: err.stack,
      })
    );
  }

  res.status(status).json({
    message: status >= 500 ? 'Internal server error' : err.message,
    // Quotable by the user, findable in the logs.
    ...(req.id ? { requestId: req.id } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { ApiError, notFound, errorHandler };
