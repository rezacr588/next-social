// lib/utils/apiResponse.js
// Unified API Response Utilities

/**
 * Creates a standardized API response object
 * @param {*} data - The response data
 * @param {string} message - Success/error message
 * @param {Array|string} errors - Error details
 * @param {Object} meta - Additional metadata
 * @returns {Object} Standardized response object
 */
export const createResponse = (data = null, message = null, errors = null, meta = null) => ({
  success: !errors,
  data,
  message,
  errors: errors ? (Array.isArray(errors) ? errors : [errors]) : null,
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    ...meta,
  },
});

/**
 * Sends a successful response
 * @param {Response} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const successResponse = (res, data, message = "Success", statusCode = 200, meta = null) => {
  return res.status(statusCode).json(createResponse(data, message, null, meta));
};

/**
 * Sends an error response
 * @param {Response} res - Express response object
 * @param {Array|string} errors - Error details
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const errorResponse = (res, errors, message = "Error", statusCode = 400, meta = null) => {
  return res.status(statusCode).json(createResponse(null, message, errors, meta));
};

/**
 * Sends a validation error response
 * @param {Response} res - Express response object
 * @param {Array|string} validationErrors - Validation error details
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const validationErrorResponse = (res, validationErrors, meta = null) => {
  return errorResponse(res, validationErrors, "Validation failed", 422, meta);
};

/**
 * Sends an authentication error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const authErrorResponse = (res, message = "Authentication required", meta = null) => {
  return errorResponse(res, ["Authentication failed"], message, 401, meta);
};

/**
 * Sends an authorization error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const authorizationErrorResponse = (res, message = "Access denied", meta = null) => {
  return errorResponse(res, ["Authorization failed"], message, 403, meta);
};

/**
 * Sends a not found error response
 * @param {Response} res - Express response object
 * @param {string} resource - Resource that was not found
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const notFoundResponse = (res, resource = "Resource", meta = null) => {
  return errorResponse(res, [`${resource} not found`], "Not found", 404, meta);
};

/**
 * Sends an internal server error response
 * @param {Response} res - Express response object
 * @param {Error} error - The error object
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const serverErrorResponse = (res, error = null, meta = null) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorDetails = isDevelopment && error ? [error.message] : ["Internal server error"];
  
  return errorResponse(
    res, 
    errorDetails, 
    "Internal server error", 
    500, 
    {
      ...meta,
      ...(isDevelopment && error && { stack: error.stack })
    }
  );
};

/**
 * Sends a method not allowed error response
 * @param {Response} res - Express response object
 * @param {Array} allowedMethods - List of allowed HTTP methods
 * @param {Object} meta - Additional metadata
 * @returns {Response} Express response
 */
export const methodNotAllowedResponse = (res, allowedMethods = [], meta = null) => {
  if (allowedMethods.length > 0) {
    res.setHeader('Allow', allowedMethods.join(', '));
  }
  
  return errorResponse(
    res, 
    ["Method not allowed"], 
    "Method not allowed", 
    405, 
    { allowedMethods, ...meta }
  );
};

/**
 * Sends a paginated response
 * @param {Response} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @returns {Response} Express response
 */
export const paginatedResponse = (res, data, pagination, message = "Success") => {
  return successResponse(res, data, message, 200, {
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || 0,
      totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 20)),
      hasNext: (pagination.page || 1) * (pagination.limit || 20) < (pagination.total || 0),
      hasPrev: (pagination.page || 1) > 1,
    }
  });
};