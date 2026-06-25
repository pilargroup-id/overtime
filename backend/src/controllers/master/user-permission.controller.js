const R = require('../../utils/response.util');
const UserPermissionService = require('../../services/master/user-permission.service');

async function index(req, res, next) {
  try {
    const result = await UserPermissionService.list(req.query);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'User permissions fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await UserPermissionService.getById(req.params.id);

    if (!data) {
      return R.notFound(res, 'User permission not found');
    }

    return R.ok(res, data, 'User permission fetched successfully');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await UserPermissionService.create(req.body, req.user);
    return R.created(res, result, 'User permission created successfully');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await UserPermissionService.update(req.params.id, req.body);

    if (!result) {
      return R.notFound(res, 'User permission not found');
    }

    return R.ok(res, result, 'User permission updated successfully');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    return next(err);
  }
}

module.exports = {
  index,
  show,
  store,
  update,
};