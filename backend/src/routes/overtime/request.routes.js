const express = require('express');
const router = express.Router();

const RequestController = require('../../controllers/overtime/request.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  RequestController.index
);

router.post(
  '/',
  authenticate,
  requireApp('overtime'),
  RequestController.store
);

router.get(
  '/eligible-employees',
  authenticate,
  requireApp('overtime'),
  RequestController.eligibleEmployees
);

router.post(
  '/bulk',
  authenticate,
  requireApp('overtime'),
  RequestController.bulkStore
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  RequestController.show
);

router.put(
  '/:id/cancel',
  authenticate,
  requireApp('overtime'),
  RequestController.cancel
);

module.exports = router;