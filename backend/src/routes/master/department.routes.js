const express = require('express');
const router  = express.Router();

const DepartmentController = require('../../controllers/master/department.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  DepartmentController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  DepartmentController.show
);

module.exports = router;
