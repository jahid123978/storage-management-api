const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storageController');
const authenticate = require('../middlewares/authMiddleware');

router.get('/quota', authenticate, storageController.getQuota);
router.get('/overview', authenticate, storageController.getOverview);

module.exports = router;
