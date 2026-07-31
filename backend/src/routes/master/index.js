const express = require('express');
const router  = express.Router();

router.use('/compensation-types', require('./compensation-type.routes'));
router.use('/user-permissions', require('./user-permission.routes'));
router.use('/approval-rules', require('./approval-rule.routes'));
router.use('/national-holidays', require('./national-holiday.routes'));

module.exports = router;