const express = require('express');
const router  = express.Router();

const ApprovalRuleController = require('../../controllers/master/approval-rule.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  ApprovalRuleController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  ApprovalRuleController.show
);

router.post(
  '/',
  authenticate,
  requireApp('overtime'),
  ApprovalRuleController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('overtime'),
  ApprovalRuleController.update
);

module.exports = router;