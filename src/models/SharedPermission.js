const mongoose = require('mongoose');

const sharedPermissionSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    permissions: {
      canView: { type: Boolean, default: true },
      canEdit: { type: Boolean, default: false },
      canFavorite: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SharedPermission', sharedPermissionSchema);