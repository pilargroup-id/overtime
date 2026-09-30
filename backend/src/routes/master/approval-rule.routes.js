const express = require('express');
const router  = express.Router();

const ApprovalRuleController = require('../../controllers/master/approval-rule.controller');
const { authenticate, requireApp, requirePermission } = require('../../middleware/auth.middleware');

router.use(
  authenticate,
  requireApp('overtime'),
  requirePermission('REQUEST_CREATE_ALL')
);

router.get('/options', ApprovalRuleController.options);
router.get('/', ApprovalRuleController.index);
router.get('/:id', ApprovalRuleController.show);
router.post('/', ApprovalRuleController.store);
router.put('/:id', ApprovalRuleController.update);

module.exports = router;
