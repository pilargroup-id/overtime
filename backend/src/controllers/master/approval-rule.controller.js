const R = require('../../utils/response.util');
const ApprovalRuleService = require('../../services/master/approval-rule.service');

async function index(req, res, next) {
  try {
    const result = await ApprovalRuleService.list(req.query);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Approval rules fetched successfully'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await ApprovalRuleService.getById(req.params.id);

    if (!data) {
      return R.notFound(res, 'Approval rule not found');
    }

    return R.ok(res, data, 'Approval rule fetched successfully');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const result = await ApprovalRuleService.create(req.body);
    return R.created(res, result, 'Approval rule created successfully');
  } catch (err) {
    if (err.statusCode === 400) {
      return R.badRequest(res, err.message, err.errors || null);
    }

    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await ApprovalRuleService.update(req.params.id, req.body);

    if (!result) {
      return R.notFound(res, 'Approval rule not found');
    }

    return R.ok(res, result, 'Approval rule updated successfully');
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