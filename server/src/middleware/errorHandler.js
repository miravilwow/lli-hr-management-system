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
    ...(req.id ? { requestId: req.id } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { ApiError, notFound, errorHandler };
