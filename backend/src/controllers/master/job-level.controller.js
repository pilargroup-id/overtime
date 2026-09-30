const R = require('../../utils/response.util');
const JobLevelService = require('../../services/master/job-level.service');

async function index(req, res, next) {
  try {
    const result = await JobLevelService.list(req.query);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Job levels fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await JobLevelService.getById(req.params.id);

    if (!data) {
      return R.notFound(res, 'Job level not found');
    }

    return R.ok(res, data, 'Job level fetched successfully');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
  show,
};
