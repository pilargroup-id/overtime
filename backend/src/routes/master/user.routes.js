const express = require('express');
const router  = express.Router();

const UserController = require('../../controllers/master/user.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp('overtime'),
  UserController.index
);

router.get(
  '/:id',
  authenticate,
  requireApp('overtime'),
  UserController.show
);

module.exports = router;
