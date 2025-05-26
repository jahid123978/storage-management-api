const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const noteSchema = Joi.object({
  name: Joi.string().max(255).required(),
  noteContent: Joi.string().required(),
  parentFolderId: Joi.string().optional().allow(null),
  pinProtected: Joi.boolean().optional(),
  pin: Joi.string().pattern(/^[0-9]{4,6}$/).when('pinProtected', { is: true, then: Joi.required() }),
});

const imageSchema = Joi.object({
  name: Joi.string().max(255).required(),
  parentFolderId: Joi.string().optional().allow("", null),
  pinProtected: Joi.boolean().optional(),
  pin: Joi.string().allow("").pattern(/^[0-9]{4,6}$/).when('pinProtected', { is: true, then: Joi.required() }),
});

const pdfSchema = imageSchema; // same validation for pdf metadata

const folderSchema = Joi.object({
  name: Joi.string().max(255).required(),
  parentFolderId: Joi.string().optional().allow("", null),
  pinProtected: Joi.boolean().optional(),
  pin: Joi.string().pattern(/^[0-9]{4,6}$/).when('pinProtected', { is: true, then: Joi.required() }),
});

module.exports = { registerSchema, loginSchema, noteSchema, imageSchema, pdfSchema, folderSchema };