module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') status = 400;                 // mongoose validation
  else if (err.name === 'CastError') { status = 400; message = 'Invalid id or value'; }
  else if (err.code === 11000) { status = 409; message = 'Duplicate value — that record already exists'; }

  res.status(status).json({ success: false, message: status === 500 ? 'Server error' : message });
};
