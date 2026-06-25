const express = require('express');
const router  = express.Router();

router.use('/requests', require('./request.routes'));
router.use('/approvals', require('./approval.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;