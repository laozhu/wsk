module.exports = (req, res, next) => {
  res.header('X-Requested-With', 'XMLHttpRequest');
  next();
};
