const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Item = require('../models/Item');
const SharedPermission = require('../models/SharedPermission');
const User = require('../models/User');
const { hashPin, comparePin } = require('../utils/pinUtils');
const { noteSchema, imageSchema, pdfSchema } = require('../validators/schemas');

// Utility: update user storage
const updateUserStorage = async (userId, delta) => {
  await User.findByIdAndUpdate(userId, { $inc: { usedStorageBytes: delta } });
};

// GET /api/v1/items (list and filter)
exports.listItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', parentFolderId, type, search, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;
    const filter = { $or: [ { userId: req.user.id }, { 'permissions.sharedWith': req.user.id } ] };
    if (parentFolderId) filter.parentFolderId = parentFolderId;
    if (type) filter.type = type;
    if (search) filter.$text = { $search: search };
    if (dateFrom || dateTo) filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);

    const totalItems = await Item.countDocuments(filter);
    const items = await Item.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      status: 'success',
      meta: { page: parseInt(page, 10), limit: parseInt(limit, 10), totalItems, totalPages: Math.ceil(totalItems / limit) },
      data: items,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/items/count-usage
exports.countUsage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$type', count: { $sum: 1 }, totalSizeBytes: { $sum: '$sizeBytes' }, averageSizeBytes: { $avg: '$sizeBytes' } } }
    ];
    const result = await Item.aggregate(pipeline);
    const counts = { note: { count: 0, totalSizeBytes: 0, averageSizeBytes: 0 }, image: { count: 0, totalSizeBytes: 0, averageSizeBytes: 0 }, pdf: { count: 0, totalSizeBytes: 0, averageSizeBytes: 0 } };
    result.forEach((r) => { if (['note', 'image', 'pdf'].includes(r._id)) counts[r._id] = { count: r.count, totalSizeBytes: r.totalSizeBytes, averageSizeBytes: r.averageSizeBytes }; });
    res.status(200).json({ status: 'success', data: counts });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/items/:itemId
exports.getItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!new mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid itemId.' } });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Item not found.' } });

    // Check ownership or sharing
    if (item.userId.toString() !== req.user.id) {
      const shared = await SharedPermission.findOne({ itemId, sharedWith: req.user.id });
      if (!shared || !shared.permissions.canView) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    res.status(200).json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/items/note
exports.createNote = async (req, res, next) => {
  try {
    const { error, value } = noteSchema.validate(req.body);
    if (error) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: error.details[0].message } });

    const { name, noteContent, parentFolderId, pinProtected, pin } = value;
    let pinHash = null;
    if (pinProtected) pinHash = await hashPin(pin);

    const sizeBytes = Buffer.byteLength(noteContent, 'utf8');
    const newNote = await Item.create({ userId: req.user.id, type: 'note', name, noteContent, parentFolderId: parentFolderId || null, sizeBytes, pinProtected: !!pinProtected, pinHash });
    await updateUserStorage(req.user.id, sizeBytes);
    res.status(201).json({ status: 'success', data: newNote });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/items/image
exports.uploadImage = async (req, res, next) => {
  try {
    const { body } = req;
    const { error, value } = imageSchema.validate({ name: body.name, parentFolderId: body.parentFolderId, pinProtected: body.pinProtected});
    console.log(error, value);
    if (error) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: error.details[0].message } });

    if (!req.file) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'File is required.' } });
    const { name, parentFolderId, pinProtected} = value;
    let pinHash = null;
    if (pinProtected) pinHash = await hashPin(pin);

    // Generate thumbnail
    const thumbFilename = `thumb-${req.file.filename}`;
    const thumbPath = path.join(req.file.destination, thumbFilename);
    await sharp(req.file.path).resize(200, 200).toFile(thumbPath);

    const fileUrl = `/uploads/${req.user.id}/images/${req.file.filename}`;
    const thumbnailUrl = `/uploads/${req.user.id}/images/${thumbFilename}`;
    const sizeBytes = req.file.size;

    const newImage = await Item.create({ userId: req.user.id, type: 'image', name, fileUrl, fileMimeType: req.file.mimetype, thumbnailUrl, sizeBytes, parentFolderId: parentFolderId? parentFolderId : null, pinProtected: !!pinProtected, pinHash });
    await updateUserStorage(req.user.id, sizeBytes);
    res.status(201).json({ status: 'success', data: newImage });
  } catch (err) {
    if (err.message === 'UNSUPPORTED_MEDIA_TYPE') return res.status(415).json({ status: 'error', error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'File type not supported.' } });
    next(err);
  }
};

// POST /api/v1/items/pdf
exports.uploadPDF = async (req, res, next) => {
  try {
    const { body } = req;
    const { error, value } = pdfSchema.validate({ name: body.name, parentFolderId: body.parentFolderId, pinProtected: body.pinProtected, pin: body.pin });
    if (error) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: error.details[0].message } });

    if (!req.file) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'File is required.' } });
    const { name, parentFolderId, pinProtected, pin } = value;
    let pinHash = null;
    if (pinProtected) pinHash = await hashPin(pin);

    const fileUrl = `/uploads/${req.user.id}/pdfs/${req.file.filename}`;
    const sizeBytes = req.file.size;

    const newPDF = await Item.create({ userId: req.user.id, type: 'pdf', name, fileUrl, fileMimeType: req.file.mimetype, sizeBytes, parentFolderId: parentFolderId || null, pinProtected: !!pinProtected, pinHash });
    await updateUserStorage(req.user.id, sizeBytes);
    res.status(201).json({ status: 'success', data: newPDF });
  } catch (err) {
    if (err.message === 'UNSUPPORTED_MEDIA_TYPE') return res.status(415).json({ status: 'error', error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'File type not supported.' } });
    next(err);
  }
};

// PUT /api/v1/items/:itemId
exports.updateItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!new mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid itemId.' } });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Item not found.' } });

    // Check permissions
    if (item.userId.toString() !== req.user.id) {
      const shared = await SharedPermission.findOne({ itemId, sharedWith: req.user.id });
      if (!shared || !shared.permissions.canEdit) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const updates = {};
    const { name, parentFolderId, noteContent, pinProtected, pin } = req.body;
    if (name) updates.name = name;
    if (parentFolderId) {
      if (!new mongoose.Types.ObjectId.isValid(parentFolderId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid parentFolderId.' } });
      const parentFolder = await Folder.findById(parentFolderId);
      if (!parentFolder || parentFolder.userId.toString() !== req.user.id) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'parentFolderId not valid.' } });
      updates.parentFolderId = parentFolderId;
    }

    if (item.type === 'note' && noteContent) {
      const newSize = Buffer.byteLength(noteContent, 'utf8');
      updates.noteContent = noteContent;
      updates.sizeBytes = newSize;
      const delta = newSize - item.sizeBytes;
      await updateUserStorage(req.user.id, delta);
    }

    if (pinProtected !== undefined) {
      if (pinProtected && !pin) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'PIN required when enabling protection.' } });
      updates.pinProtected = pinProtected;
      updates.pinHash = pinProtected ? await hashPin(pin) : null;
    }

    Object.assign(item, updates);
    await item.save();
    res.status(200).json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/items/:itemId
exports.deleteItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!new mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid itemId.' } });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Item not found.' } });
    if (item.userId.toString() !== req.user.id) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    // If folder: recursively delete children
    const deleteRecursively = async (id) => {
      const children = await Item.find({ parentFolderId: id });
      for (const child of children) {
        await deleteRecursively(child._id);
      }
      if (item.type === 'image' || item.type === 'pdf') {
        const filePath = path.join(__dirname, '../../', item.fileUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (item.type === 'image') {
          const thumbPath = path.join(__dirname, '../../', item.thumbnailUrl);
          if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }
      }
      await updateUserStorage(req.user.id, -item.sizeBytes);
      await SharedPermission.deleteMany({ itemId: item._id });
      await Item.findByIdAndDelete(item._id);
    };
    await deleteRecursively(itemId);

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/items/:itemId/copy
exports.copyItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { targetFolderId, newName } = req.body;
    if (!new mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid itemId.' } });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Item not found.' } });

    // Permission
    if (item.userId.toString() !== req.user.id) {
      const shared = await SharedPermission.findOne({ itemId, sharedWith: req.user.id });
      if (!shared || !shared.permissions.canEdit) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    let parentId = null;
    if (targetFolderId) {
      if (!new mongoose.Types.ObjectId.isValid(targetFolderId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid targetFolderId.' } });
      const parentFolder = await Folder.findById(targetFolderId);
      if (!parentFolder || parentFolder.userId.toString() !== req.user.id) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'targetFolderId not valid.' } });
      parentId = targetFolderId;
    }

    // Recursive copy function
    const copyRecursively = async (origItem, destParentId) => {
      const copiedData = origItem.toObject();
      delete copiedData._id;
      copiedData.parentFolderId = destParentId;
      copiedData.name = newName || `${origItem.name} (Copy)`;
      if (origItem.type !== 'folder') {
        // Duplicate file on disk
        const origPath = path.join(__dirname, '../../', origItem.fileUrl);
        const ext = path.extname(origPath);
        const newFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const destDir = path.dirname(origPath);
        const newPath = path.join(destDir, newFilename);
        fs.copyFileSync(origPath, newPath);
        copiedData.fileUrl = `/uploads/${req.user.id}/${origItem.type === 'image' ? 'images' : 'pdfs'}/${newFilename}`;
        copiedData.sizeBytes = origItem.sizeBytes;
        if (origItem.type === 'image') {
          const origThumb = path.join(__dirname, '../../', origItem.thumbnailUrl);
          const newThumb = path.join(destDir, `thumb-${newFilename}`);
          fs.copyFileSync(origThumb, newThumb);
          copiedData.thumbnailUrl = `/uploads/${req.user.id}/images/thumb-${newFilename}`;
        }
      }
      const newItem = await Item.create(copiedData);
      await updateUserStorage(req.user.id, newItem.sizeBytes);

      if (origItem.type === 'folder') {
        const children = await Item.find({ parentFolderId: origItem._id });
        for (const child of children) {
          await copyRecursively(child, newItem._id);
        }
      }
      return newItem;
    };

    const copiedRoot = await copyRecursively(item, parentId);
    res.status(201).json({ status: 'success', data: { copiedItemId: copiedRoot._id, message: 'Item copied successfully.' } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/items/:itemId/share
exports.shareItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { sharedWithUserId, canEdit, canFavorite } = req.body;
    if (!new mongoose.Types.ObjectId.isValid(itemId) || !new mongoose.Types.ObjectId.isValid(sharedWithUserId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid IDs.' } });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Item not found.' } });
    if (item.userId.toString() !== req.user.id) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    const sharedUser = await User.findById(sharedWithUserId);
    if (!sharedUser) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'User to share with not found.' } });

    const existing = await SharedPermission.findOne({ itemId, sharedWith: sharedWithUserId });
    if (existing) {
      existing.permissions.canEdit = canEdit;
      existing.permissions.canFavorite = canFavorite;
      await existing.save();
    } else {
      await SharedPermission.create({ itemId, sharedBy: req.user.id, sharedWith: sharedWithUserId, permissions: { canView: true, canEdit: !!canEdit, canFavorite: !!canFavorite } });
      item.isShared = true;
      await item.save();
    }

    res.status(200).json({ status: 'success', data: { message: `Item shared with user ${sharedWithUserId}` } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/items/:itemId/share/:sharedWithUserId
exports.revokeShare = async (req, res, next) => {
  try {
    const { itemId, sharedWithUserId } = req.params;
    if (!new mongoose.Types.ObjectId.isValid(itemId) || !new mongoose.Types.ObjectId.isValid(sharedWithUserId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid IDs.' } });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Item not found.' } });
    if (item.userId.toString() !== req.user.id) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    const shared = await SharedPermission.findOneAndDelete({ itemId, sharedWith: sharedWithUserId });
    if (!shared) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Share not found.' } });

    const stillShared = await SharedPermission.findOne({ itemId });
    if (!stillShared) {
      item.isShared = false;
      await item.save();
    }

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/items/:itemId/favorite
exports.toggleFavorite = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { favorite } = req.body;
    if (!new mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid itemId.' } });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Item not found.' } });

    // Permission
    if (item.userId.toString() !== req.user.id) {
      const shared = await SharedPermission.findOne({ itemId, sharedWith: req.user.id });
      if (!shared || !shared.permissions.canFavorite) return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    item.isFavorite = favorite !== undefined ? favorite : !item.isFavorite;
    await item.save();
    res.status(200).json({ status: 'success', data: { id: item._id, type: item.type, name: item.name, isFavorite: item.isFavorite } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/items/calendar
exports.getCalendar = async (req, res, next) => {
  try {
    const { period, date, type } = req.query;
    if (!['day', 'week', 'month'].includes(period)) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Invalid period.' } });
    const baseDate = date ? new Date(date) : new Date();
    let startDate, endDate;

    if (period === 'day') {
      startDate = new Date(baseDate.setHours(0, 0, 0, 0));
      endDate = new Date(baseDate.setHours(23, 59, 59, 999));
    } else if (period === 'week') {
      const day = baseDate.getDay();
      const diffToMonday = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(baseDate.setDate(diffToMonday));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const filter = { userId: req.user.id, createdAt: { $gte: startDate, $lte: endDate } };
    if (type) filter.type = type;
    const items = await Item.find(filter).select('id type name createdAt');

    const itemsByDate = {};
    items.forEach((item) => {
      const d = item.createdAt.toISOString().split('T')[0];
      if (!itemsByDate[d]) itemsByDate[d] = [];
      itemsByDate[d].push({ id: item._id, type: item.type, name: item.name });
    });

    res.status(200).json({ status: 'success', data: { period, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], itemsByDate } });
  } catch (err) {
    next(err);
  }
};
