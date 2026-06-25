const express = require('express');
const router  = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/master', require('./master'));
router.use('/overtime', require('./overtime'));

module.exports = router;