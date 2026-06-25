const R = require('../../utils/response.util');
const CompensationTypeService = require('../../services/master/compensation-type.service');

async function index(req, res, next) {
  try {
    const result = await CompensationTypeService.list(req.query);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Compensation types fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await CompensationTypeService.getById(req.params.id);

    if (!data) {
      return R.notFound(res, 'Compensation type not found');
    }

    return R.ok(res, data, 'Compensation type fetched successfully');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await CompensationTypeService.create(req.body);
    return R.created(res, result, 'Compensation type created successfully');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await CompensationTypeService.update(req.params.id, req.body);

    if (!result) {
      return R.notFound(res, 'Compensation type not found');
    }

    return R.ok(res, result, 'Compensation type updated successfully');
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