const authService = require('../services/authService');
const { ApiError } = require('../middleware/errorHandler');

async function login(req, res) {
  const { username, password } = req.body;
  const result = await authService.login(username, password);
  res.json(result);
}

/** Returns the account behind the presented token - used by the client on reload. */
async function me(req, res) {
  const user = await authService.getUserById(req.user.userId);

  if (!user) {
    // Token is well-formed but the account no longer exists.
    throw new ApiError(401, 'Account no longer exists');
  }

  res.json(user);
}

async function refresh(req, res) {
  const result = await authService.refresh(req.body.refreshToken);
  res.json(result);
}

async function logout(req, res) {
  await authService.logout(req.body.refreshToken);

  // Idempotent on purpose: signing out twice, or with a token the server
  // has already revoked, is not an error worth surfacing to the user.
  res.status(204).send();
}

module.exports = { login, refresh, logout, me };
