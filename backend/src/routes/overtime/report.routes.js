const express = require('express');
const router  = express.Router();

const ReportController = require('../../controllers/overtime/report.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  ReportController.index
);

router.put(
  '/talenta-status/bulk',
  authenticate,
  requireApp('overtime'),
  ReportController.bulkUpdateTalentaStatus
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  ReportController.show
);

router.put(
  '/:id/talenta-status',
  authenticate,
  requireApp('overtime'),
  ReportController.updateTalentaStatus
);

module.exports = router;