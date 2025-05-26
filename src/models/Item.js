const mongoose = require('mongoose');

const options = { timestamps: true, discriminatorKey: 'type' };

const itemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    sizeBytes: { type: Number, default: 0 },
    isFavorite: { type: Boolean, default: false, index: true },
    isShared: { type: Boolean, default: false },
    ownerOnly: { type: Boolean, default: true },
    pinProtected: { type: Boolean, default: false },
    pinHash: { type: String, default: null },
    // Additional fields: noteContent, fileUrl, fileMimeType, thumbnailUrl
  },
  options
);

const Item = mongoose.model('Item', itemSchema);

const noteSchema = new mongoose.Schema({ noteContent: { type: String, default: '' } });
const imageSchema = new mongoose.Schema({ fileUrl: { type: String, required: true }, fileMimeType: { type: String, enum: ['image/jpeg', 'image/png'], required: true }, thumbnailUrl: { type: String } });
const pdfSchema = new mongoose.Schema({ fileUrl: { type: String, required: true }, fileMimeType: { type: String, enum: ['application/pdf'], required: true } });

Item.discriminator('note', noteSchema);
Item.discriminator('image', imageSchema);
Item.discriminator('pdf', pdfSchema);

module.exports = Item;