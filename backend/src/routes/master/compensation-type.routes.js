const express = require('express');
const router  = express.Router();

const CompensationTypeController = require('../../controllers/master/compensation-type.controller');
const { authenticate, requireApp, requirePermission } = require('../../middleware/auth.middleware');

router.use(
  authenticate,
  requireApp('overtime'),
  requirePermission('REQUEST_CREATE_ALL')
);

router.get('/', CompensationTypeController.index);
router.get('/:id', CompensationTypeController.show);
router.post('/', CompensationTypeController.store);
router.put('/:id', CompensationTypeController.update);

module.exports = router;
