/**
 * Async Handler to wrap async route handlers
 * Eliminates the need for try-catch blocks
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
