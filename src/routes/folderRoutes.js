const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authenticate = require('../middlewares/authMiddleware');

router.post('/', authenticate, folderController.createFolder);
router.get('/', authenticate, folderController.listFolders);
router.patch('/:folderId', authenticate, folderController.updateFolder);
router.delete('/:folderId', authenticate, folderController.deleteFolder);

module.exports = router;