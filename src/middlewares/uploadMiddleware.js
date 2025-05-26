// const multer = require('multer');
// const path = require('path');

// const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 5242880;

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // e.g., uploads/{userId}/{type}/
//     const userId = req.user.id;
//     const folder = file.mimetype.startsWith('image/') ? 'images' : 'pdfs';
//     const dest = path.join(__dirname, '../../uploads', userId, folder);
//     cb(null, dest);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
//     cb(null, filename);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   if (file.fieldname === 'file') {
//     const allowedMime = ['image/jpeg', 'image/png', 'application/pdf'];
//     if (!allowedMime.includes(file.mimetype)) {
//       return cb(new Error('UNSUPPORTED_MEDIA_TYPE'), false);
//     }
//   }
//   cb(null, true);
// };

// const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

// module.exports = { upload };


// uploadMiddleware.js
const multer = require('multer');
const path  = require('path');
const fs    = require('fs');

// Max 5 MB (or override via ENV)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 1) Make sure req.user.id exists:
    if (!req.user || !req.user.id) {
      // If req.user is missing, Multer will never write the file.  
      // We can bail out early and let your controller respond accordingly.
      return cb(new Error('USER_UNAUTHENTICATED'), null);
    }

    // 2) Decide on subfolder: "images" vs "pdfs"
    const userId = req.user.id.toString();
    const folder = file.mimetype.startsWith('image/') ? 'images' : 'pdfs';

    // 3) Build the full path: ../../uploads/{userId}/{images or pdfs}
    const dest = path.join(__dirname, '../../uploads', userId, folder);

    // 4) Ensure the folder actually exists before Multer writes into it:
    try {
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (mkdirErr) {
      return cb(mkdirErr, null);
    }
  },

  filename: (req, file, cb) => {
    // Keep your existing naming scheme:
    const ext      = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Only apply the check if the fieldname is exactly "file"
  if (file.fieldname === 'file') {
     console.log('>> Multer saw MIME type:', file.mimetype);
    const allowedMime = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_MEDIA_TYPE'), false);
    }
  }
  // Otherwise accept:
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

module.exports = { upload };
