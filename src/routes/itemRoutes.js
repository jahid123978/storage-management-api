const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authenticate = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.get('/', authenticate, itemController.listItems);
router.get('/count-usage', authenticate, itemController.countUsage);
router.get('/calendar', authenticate, itemController.getCalendar);
router.get('/:itemId', authenticate, itemController.getItem);
router.post('/note', authenticate, itemController.createNote);
router.post('/image', authenticate, upload.single('file'), itemController.uploadImage);
router.post('/pdf', authenticate, upload.single('file'), itemController.uploadPDF);
router.put('/:itemId', authenticate, itemController.updateItem);
router.delete('/:itemId', authenticate, itemController.deleteItem);
router.post('/:itemId/copy', authenticate, itemController.copyItem);
router.post('/:itemId/share', authenticate, itemController.shareItem);
router.delete('/:itemId/share/:sharedWithUserId', authenticate, itemController.revokeShare);
router.post('/:itemId/favorite', authenticate, itemController.toggleFavorite);

module.exports = router;