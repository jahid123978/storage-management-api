const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Folder = require('../models/Folder');
const Item = require('../models/Item');
const SharedPermission = require('../models/SharedPermission');
const User = require('../models/User');
const { hashPin, comparePin } = require('../utils/pinUtils');
const { folderSchema } = require('../validators/schemas');

// POST /api/v1/folders
exports.createFolder = async (req, res, next) => {
  try {
    const { error, value } = folderSchema.validate(req.body);
    if (error) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: error.details[0].message } });

    const { name, parentFolderId, pinProtected, pin } = value;
    let pinHash = null;
    if (pinProtected) pinHash = await hashPin(pin);

    if (parentFolderId) {
      if (!new mongoose.Types.ObjectId.isValid(parentFolderId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid parentFolderId.' } });
      const parentFolder = await Folder.findById(parentFolderId);
      if (!parentFolder || parentFolder.userId.toString() !== req.user.id) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'parentFolderId not valid.' } });
    }

    const existing = await Folder.findOne({ userId: req.user.id, parentFolderId: parentFolderId || null, name });
    if (existing) return res.status(409).json({ status: 'error', error: { code: 'CONFLICT', message: 'Folder name already exists.' } });

    const newFolder = await Folder.create({ userId: req.user.id, name, parentFolderId: parentFolderId || null, pinProtected: !!pinProtected, pinHash });
    res.status(201).json({ status: 'success', data: newFolder });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/folders
exports.listFolders = async (req, res, next) => {
  try {
    const { parentFolderId = null, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;
    if (parentFolderId && !new mongoose.Types.ObjectId.isValid(parentFolderId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid parentFolderId.' } });
    const skip = (page - 1) * limit;
    const filter = { userId: req.user.id, parentFolderId: parentFolderId || null };

    const totalItems = await Folder.countDocuments(filter);
    const folders = await Folder.find(filter).sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit, 10));

    res.status(200).json({ status: 'success', meta: { page: parseInt(page, 10), limit: parseInt(limit, 10), totalItems, totalPages: Math.ceil(totalItems / limit) }, data: folders });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/folders/:folderId
exports.updateFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    if (!new mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid folderId.' } });

    const folder = await Folder.findById(folderId);
    if (!folder) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Folder not found.' } });
    if (folder.userId.toString() !== req.user.id) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    const { name, parentFolderId, pinProtected, pin } = req.body;
    if (name) {
      const existing = await Folder.findOne({ userId: req.user.id, parentFolderId: folder.parentFolderId || null, name });
      if (existing && existing._id.toString() !== folderId) return res.status(409).json({ status: 'error', error: { code: 'CONFLICT', message: 'Folder name already exists.' } });
      folder.name = name;
    }
    if (parentFolderId) {
      if (!new mongoose.Types.ObjectId.isValid(parentFolderId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid parentFolderId.' } });
      const parentFolder = await Folder.findById(parentFolderId);
      if (!parentFolder || parentFolder.userId.toString() !== req.user.id) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'parentFolderId not valid.' } });
      // Prevent cycles
      let current = parentFolder;
      while (current) {
        if (current._id.toString() === folderId) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Cannot move folder into its own descendant.' } });
        current = await Folder.findById(current.parentFolderId);
      }
      folder.parentFolderId = parentFolderId;
    }
    if (pinProtected !== undefined) {
      if (pinProtected && !pin) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'PIN required when enabling protection.' } });
      folder.pinProtected = pinProtected;
      folder.pinHash = pinProtected ? await hashPin(pin) : null;
    }
    await folder.save();
    res.status(200).json({ status: 'success', data: folder });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/folders/:folderId
exports.deleteFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    if (!new mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid folderId.' } });

    const folder = await Folder.findById(folderId);
    if (!folder) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Folder not found.' } });
    if (folder.userId.toString() !== req.user.id) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    // Recursively delete children items/folders
    const deleteFolderRecursively = async (id) => {
      const subFolders = await Folder.find({ parentFolderId: id });
      for (const sub of subFolders) {
        await deleteFolderRecursively(sub._id);
      }
      const items = await Item.find({ parentFolderId: id });
      for (const item of items) {
        // reuse delete logic from itemController
        await Item.findByIdAndDelete(item._id);
        await SharedPermission.deleteMany({ itemId: item._id });
        if (item.type === 'image' || item.type === 'pdf') {
          const filePath = path.join(__dirname, '../../', item.fileUrl);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          if (item.type === 'image') {
            const thumbPath = path.join(__dirname, '../../', item.thumbnailUrl);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
          }
          await updateUserStorage(req.user.id, -item.sizeBytes);
        }
      }
      await Folder.findByIdAndDelete(id);
    };
    await deleteFolderRecursively(folderId);

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};