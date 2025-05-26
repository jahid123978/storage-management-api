const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendResetPasswordEmail } = require('../utils/emailUtils');
const { registerSchema, loginSchema } = require('../validators/schemas');

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Register
exports.register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: error.details[0].message } });

    const { username, email, password } = value;
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(409).json({ status: 'error', error: { code: 'CONFLICT', message: 'Username or email already exists.' } });

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10));
    const user = await User.create({ username, email, passwordHash });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    // TODO: store hashed refreshToken in DB or Redis

    res.status(201).json({ status: 'success', data: { user: { id: user._id, username: user.username, email: user.email, createdAt: user.createdAt }, tokens: { accessToken, refreshToken } } });
  } catch (err) {
    next(err);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: error.details[0].message } });

    const { email, password } = value;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid credentials.' } });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid credentials.' } });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    // TODO: store hashed refreshToken in DB or Redis

    res.status(200).json({ status: 'success', data: { user: { id: user._id, username: user.username, email: user.email }, tokens: { accessToken, refreshToken } } });
  } catch (err) {
    next(err);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    // TODO: invalidate refresh token from DB/Redis
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

// Forgot-Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Email is required.' } });

    const user = await User.findOne({ email });
    if (user) {
      const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordTokenHash = resetTokenHash;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();
      await sendResetPasswordEmail(email, resetToken);
    }
    res.status(200).json({ status: 'success', data: { message: 'If an account with that email exists, a password reset email was sent.' } });
  } catch (err) {
    next(err);
  }
};

// Reset-Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.query;
    const { newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Token and newPassword are required.' } });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordTokenHash: hashedToken, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(401).json({ status: 'error', error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' } });

    user.passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10));
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ status: 'success', data: { message: 'Password has been reset successfully.' } });
  } catch (err) {
    next(err);
  }
};

// Get current user profile
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
};

// Change Password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Both currentPassword and newPassword are required.' } });

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect.' } });

    user.passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10));
    await user.save();
    res.status(200).json({ status: 'success', data: { message: 'Password changed successfully.' } });
  } catch (err) {
    next(err);
  }
};

// Change Username
exports.changeUsername = async (req, res, next) => {
  try {
    const { password, newUsername } = req.body;
    if (!password || !newUsername) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Password and newUsername are required.' } });

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Password is incorrect.' } });

    const exists = await User.findOne({ username: newUsername });
    if (exists) return res.status(409).json({ status: 'error', error: { code: 'CONFLICT', message: 'Username already taken.' } });

    user.username = newUsername;
    await user.save();
    res.status(200).json({ status: 'success', data: { user: { id: user._id, username: user.username, email: user.email } } });
  } catch (err) {
    next(err);
  }
};

// Delete Account
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Password is required.' } });

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Password is incorrect.' } });

    // TODO: cascade delete items, folders, sharedPermissions, and file cleanup
    await User.findByIdAndDelete(user._id);
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};