const R = require('../../utils/response.util');
const RequestService = require('../../services/overtime/request.service');

async function index(req, res, next) {
  try {
    const result = await RequestService.list(req.query, req.user);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Overtime requests fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await RequestService.getById(req.params.id, req.user);

    if (!data) {
      return R.notFound(res, 'Overtime request not found');
    }

    return R.ok(res, data, 'Overtime request fetched successfully');
  } catch (err) {
    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

async function eligibleEmployees(req, res, next) {
  try {
    const result = await RequestService.getEligibleEmployees(req.query, req.user);

    return R.ok(res, result, 'Eligible employees fetched successfully');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await RequestService.create(req.body, req.user);
    return R.created(res, result, 'Overtime request submitted successfully');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

async function bulkStore(req, res, next) {
  try {
    const result = await RequestService.bulkCreate(req.body, req.user);

    if (result.success_count === 0) {
      return R.badRequest(res, 'Bulk overtime requests failed', result);
    }

    return R.ok(res, result, 'Bulk overtime requests processed');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await RequestService.cancel(req.params.id, req.body, req.user);

    if (!result) {
      return R.notFound(res, 'Overtime request not found');
    }

    return R.ok(res, result, 'Overtime request canceled successfully');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

module.exports = {
  index,
  show,
  eligibleEmployees,
  store,
  bulkStore,
  cancel,
};