const express = require('express');
const router  = express.Router();

const CompensationTypeController = require('../../controllers/master/compensation-type.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  CompensationTypeController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  CompensationTypeController.show
);

router.post(
  '/',
  authenticate,
  requireApp('overtime'),
  CompensationTypeController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('overtime'),
  CompensationTypeController.update
);

module.exports = router;