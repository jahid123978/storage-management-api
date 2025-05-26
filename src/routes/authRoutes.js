const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.patch('/me/change-password', authenticate, authController.changePassword);
router.patch('/me/change-username', authenticate, authController.changeUsername);
router.delete('/me/delete-account', authenticate, authController.deleteAccount);

module.exports = router;