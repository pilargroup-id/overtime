const express = require('express');
const router  = express.Router();

const ApprovalController = require('../../controllers/overtime/approval.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  ApprovalController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  ApprovalController.show
);

router.put(
  '/bulk/approve',
  authenticate,
  requireApp('overtime'),
  ApprovalController.bulkApprove
);

router.put(
  '/bulk/reject',
  authenticate,
  requireApp('overtime'),
  ApprovalController.bulkReject
);

router.put(
  '/:id/approve',
  authenticate,
  requireApp('overtime'),
  ApprovalController.approve
);

router.put(
  '/:id/reject',
  authenticate,
  requireApp('overtime'),
  ApprovalController.reject
);

module.exports = router;
