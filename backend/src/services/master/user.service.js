const UserModel = require('../../models/user.model');

async function list(query = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 500, 1), 1000);
  const search = query.search || null;
  const active = query.active ?? query.is_active ?? 1;
  const allUsers = String(active) === 'all';

  return UserModel.findActiveUsersForOvertimeOptions({
    search,
    limit,
    allUsers: true,
    active: allUsers ? 'all' : 1,
  });
}

async function getById(id) {
  return UserModel.findFullProfileById(id);
}

module.exports = {
  list,
  getById,
};
