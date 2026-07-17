const R = require('../../utils/response.util');
const ApprovalService = require('../../services/overtime/approval.service');

async function index(req, res, next) {
  try {
    const result = await ApprovalService.list(req.query, req.user);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Overtime approvals fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await ApprovalService.getById(req.params.id, req.user);

    if (!data) {
      return R.notFound(res, 'Overtime approval not found');
    }

    return R.ok(res, data, 'Overtime approval fetched successfully');
  } catch (err) {
    if (err.statusCode === 403) {
      return R.forbidden(res, err.message);
    }

    return next(err);
  }
}

async function approve(req, res, next) {
  try {
    const result = await ApprovalService.approve(req.params.id, req.body, req.user);

    if (!result) {
      return R.notFound(res, 'Overtime approval not found');
    }

    return R.ok(res, result, 'Overtime request approved successfully');
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

async function reject(req, res, next) {
  try {
    const result = await ApprovalService.reject(req.params.id, req.body, req.user);

    if (!result) {
      return R.notFound(res, 'Overtime approval not found');
    }

    return R.ok(res, result, 'Overtime request rejected successfully');
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

async function bulkApprove(req, res, next) {
  try {
    const result = await ApprovalService.bulkApprove(req.body, req.user);

    return R.ok(res, result, 'Overtime requests approved successfully');
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

async function bulkReject(req, res, next) {
  try {
    const result = await ApprovalService.bulkReject(req.body, req.user);

    return R.ok(res, result, 'Overtime requests rejected successfully');
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
  approve,
  reject,
  bulkApprove,
  bulkReject,
};
