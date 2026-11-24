import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';

const allowedFields = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'];
const requiredFields = ['name', 'sku', 'category', 'price'];
const stringFields = ['name', 'sku', 'category', 'supplier'];
const numberFields = ['price', 'quantity', 'reorderLevel'];

// checks the request body and keeps only the allowed fields
const checkBody = (body, isUpdate) => {
  const data = {};
  const errors = [];

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });

  // required fields are only needed when creating
  if (!isUpdate) {
    requiredFields.forEach((field) => {
      if (data[field] === undefined || data[field] === '') {
        errors.push(`${field} is required`);
      }
    });
  }

  if (isUpdate && Object.keys(data).length === 0) {
    errors.push('Send at least one field to update');
  }

  stringFields.forEach((field) => {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  });

  numberFields.forEach((field) => {
    if (data[field] !== undefined && (typeof data[field] !== 'number' || !Number.isFinite(data[field]))) {
      errors.push(`${field} must be a number`);
    }
  });

  ['quantity', 'reorderLevel'].forEach((field) => {
    if (typeof data[field] === 'number' && !Number.isInteger(data[field])) {
      errors.push(`${field} must be a whole number`);
    }
  });

  return { data, errors };
};

const makeValidator = (isUpdate) => (req, res, next) => {
  const { data, errors } = checkBody(req.body || {}, isUpdate);

  if (errors.length > 0) {
    const err = new AppError('Validation failed', 400);
    err.errors = errors;
    return next(err);
  }

  req.body = data;
  next();
};

export const validateCreate = makeValidator(false);
export const validateUpdate = makeValidator(true);

// checks that :id is a valid mongo id
export const validateId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError(`Invalid product id: ${req.params.id}`, 400));
  }
  next();
};

// body for the stock route -> { "change": 10 } or { "change": -3 }
export const validateStockChange = (req, res, next) => {
  const change = req.body ? req.body.change : undefined;

  if (typeof change !== 'number' || !Number.isInteger(change)) {
    return next(new AppError('change must be a whole number (+ for restock, - for sale)', 400));
  }
  if (change === 0) {
    return next(new AppError('change cannot be 0', 400));
  }
  next();
};
