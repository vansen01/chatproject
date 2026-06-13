function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Войдите в аккаунт, чтобы открыть чат.');
    return res.redirect('/login');
  }

  return next();
}

function redirectIfAuth(req, res, next) {
  if (req.session.user) {
    return res.redirect('/users');
  }

  return next();
}

module.exports = {
  requireAuth,
  redirectIfAuth
};
