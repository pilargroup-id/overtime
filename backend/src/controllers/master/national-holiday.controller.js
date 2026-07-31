const R = require('../../utils/response.util');
const NationalHolidayService = require('../../services/master/national-holiday.service');

async function index(req, res, next) {
  try {
    const result = await NationalHolidayService.list(req.query);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'National holidays fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await NationalHolidayService.getById(req.params.id);

    if (!data) {
      return R.notFound(res, 'National holiday not found');
    }

    return R.ok(res, data, 'National holiday fetched successfully');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await NationalHolidayService.create(req.body, req.user);
    return R.created(res, result, 'National holiday created successfully');
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

async function update(req, res, next) {
  try {
    const result = await NationalHolidayService.update(req.params.id, req.body, req.user);

    if (!result) {
      return R.notFound(res, 'National holiday not found');
    }

    return R.ok(res, result, 'National holiday updated successfully');
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
  store,
  update,
};
