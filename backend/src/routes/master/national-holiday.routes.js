const express = require('express');
const router = express.Router();

const NationalHolidayController = require('../../controllers/master/national-holiday.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  NationalHolidayController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  NationalHolidayController.show
);

router.post(
  '/',
  authenticate,
  requireApp('overtime'),
  NationalHolidayController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('overtime'),
  NationalHolidayController.update
);

module.exports = router;
