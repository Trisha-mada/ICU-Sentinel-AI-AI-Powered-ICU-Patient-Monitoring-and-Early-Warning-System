/**
 * Centralized Error Handling Middleware for ICU Sentinel API
 */
function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message);

  // Avoid exposing stack traces or internal DB credentials
  const statusCode = err.statusCode || 500;
  const clientMessage = statusCode === 500 
    ? 'An internal server error occurred while processing the request.'
    : err.message;

  res.status(statusCode).json({
    error: true,
    message: clientMessage,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler
};
