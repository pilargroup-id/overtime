const R = require('../../utils/response.util');
const DepartmentService = require('../../services/master/department.service');

async function index(req, res, next) {
  try {
    const result = await DepartmentService.list(req.query);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Departments fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await DepartmentService.getById(req.params.id);

    if (!data) {
      return R.notFound(res, 'Department not found');
    }

    return R.ok(res, data, 'Department fetched successfully');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
  show,
};
