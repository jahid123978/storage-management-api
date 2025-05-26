const Item = require('../models/Item');
const Folder = require('../models/Folder');
const mongoose = require('mongoose');
// GET /api/v1/storage/quota
exports.getQuota = async (req, res, next) => {
  try {
    const user = req.user;
    const quota = user.storageQuotaBytes;
    const used = user.usedStorageBytes;
    const available = quota - used;
    const humanSize = (bytes) => {
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KiB', 'MiB', 'GiB', 'TiB'][i];
    };
    res.status(200).json({
      status: 'success',
      data: {
        storageQuotaBytes: quota,
        usedStorageBytes: used,
        availableStorageBytes: available,
        usedStorageHuman: humanSize(used),
        quotaHuman: humanSize(quota),
        availableHuman: humanSize(available),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/storage/overview
exports.getOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pipeline = [
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId)
        } 
      },
      { 
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalSizeBytes: { $sum: "$sizeBytes" },
          averageSizeBytes: { $avg: "$sizeBytes" }
        } 
      }
    ];
    const result = await Item.aggregate(pipeline);
    
    const overview = { 
      note: { count: 0, totalSizeBytes: 0, averageSizeBytes: 0 }, 
      image: { count: 0, totalSizeBytes: 0, averageSizeBytes: 0 }, 
      pdf: { count: 0, totalSizeBytes: 0, averageSizeBytes: 0 }, 
      folder: { count: 0, totalSizeBytes: 0, averageSizeBytes: 0 } 
    };
    
    result.forEach((r) => {
      overview[r._id] = { 
        count: r.count, 
        totalSizeBytes: r.totalSizeBytes, 
        averageSizeBytes: r.averageSizeBytes 
      };
    });
    
    res.status(200).json({ status: "success", data: overview });
  } catch (err) {
    next(err);
  }
};