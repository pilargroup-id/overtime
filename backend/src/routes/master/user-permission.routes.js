const express = require('express');
const router  = express.Router();

const UserPermissionController = require('../../controllers/master/user-permission.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  UserPermissionController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  UserPermissionController.show
);

router.post(
  '/',
  authenticate,
  requireApp('overtime'),
  UserPermissionController.store
);

router.put(
  '/:id',
  authenticate,
  requireApp('overtime'),
  UserPermissionController.update
);

module.exports = router;