const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ status: 'error', error: { code: 'INVALID_TOKEN', message: 'Token is invalid.' } });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' } });
  }
};

module.exports = authenticate;