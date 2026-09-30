const R = require('../../utils/response.util');
const UserService = require('../../services/master/user.service');

async function index(req, res, next) {
  try {
    const data = await UserService.list(req.query);

    return R.ok(res, data, 'Users fetched successfully');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await UserService.getById(req.params.id);

    if (!data) {
      return R.notFound(res, 'User not found');
    }

    return R.ok(res, data, 'User fetched successfully');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
  show,
};
