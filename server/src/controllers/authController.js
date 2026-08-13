const authService = require('../services/authService');
const { ApiError } = require('../middleware/errorHandler');

async function login(req, res) {
  const { username, password } = req.body;
  const result = await authService.login(username, password);
  res.json(result);
}

async function me(req, res) {
  const user = await authService.getUserById(req.user.userId);

  if (!user) {
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

  res.status(204).send();
}

module.exports = { login, refresh, logout, me };
