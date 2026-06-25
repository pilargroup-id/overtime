const R = require('../../utils/response.util');
const ReportService = require('../../services/overtime/report.service');

async function index(req, res, next) {
  try {
    const result = await ReportService.list(req.query, req.user);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Overtime reports fetched successfully'
    );
  } catch (err) {
    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await ReportService.getById(req.params.id, req.user);

    if (!data) {
      return R.notFound(res, 'Overtime request not found');
    }

    return R.ok(res, data, 'Overtime report fetched successfully');
  } catch (err) {
    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

async function updateTalentaStatus(req, res, next) {
  try {
    const result = await ReportService.updateTalentaStatus(
      req.params.id,
      req.body,
      req.user
    );

    if (!result) {
      return R.notFound(res, 'Overtime request not found');
    }

    return R.ok(res, result, 'Talenta status updated successfully');
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

async function bulkUpdateTalentaStatus(req, res, next) {
  try {
    const result = await ReportService.bulkUpdateTalentaStatus(req.body, req.user);

    return R.ok(res, result, 'Talenta status bulk updated successfully');
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
  updateTalentaStatus,
  bulkUpdateTalentaStatus,
};