const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    pinProtected: { type: Boolean, default: false },
    pinHash: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Folder', folderSchema);
