const express = require('express');
const router  = express.Router();

const JobLevelController = require('../../controllers/master/job-level.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  JobLevelController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  JobLevelController.show
);

module.exports = router;
