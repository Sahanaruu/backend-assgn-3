import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';

// only these fields can be used for sorting
const sortFields = ['name', 'sku', 'category', 'price', 'quantity', 'createdAt', 'updatedAt'];

// so special characters in search text don't break the regex
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/products
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// GET /api/products
// example: ?category=Furniture&search=table&minPrice=100&maxPrice=5000&sort=-price&page=1&limit=10
export const getProducts = async (req, res, next) => {
  try {
    const { category, supplier, search, minPrice, maxPrice, inStock } = req.query;

    const filter = {};

    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (supplier) filter.supplier = new RegExp(escapeRegex(supplier), 'i');
    if (search) filter.name = new RegExp(escapeRegex(search), 'i');

    // price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        if (isNaN(Number(minPrice))) return next(new AppError('minPrice must be a number', 400));
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined) {
        if (isNaN(Number(maxPrice))) return next(new AppError('maxPrice must be a number', 400));
        filter.price.$lte = Number(maxPrice);
      }
    }

    if (inStock === 'true') filter.quantity = { $gt: 0 };
    if (inStock === 'false') filter.quantity = 0;

    // sorting (newest first by default)
    let sortBy = '-createdAt';
    if (req.query.sort) {
      const fields = req.query.sort
        .split(',')
        .filter((f) => sortFields.includes(f.replace('-', '')));
      if (fields.length > 0) sortBy = fields.join(' ');
    }

    // pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // count and products together so we only need one await
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort(sortBy).skip(skip).limit(limit)
    ]);

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id/stock   body: { "change": 10 }
// positive = restock, negative = sale
export const adjustStock = async (req, res, next) => {
  try {
    const { change } = req.body;

    // quantity check and update happen in the same query,
    // so stock can never go below 0 even if two sales come together
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: -change } },
      { $inc: { quantity: change } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return next(new AppError('Product not found or not enough stock for this sale', 400));
    }

    res.json({ message: 'Stock updated', product });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    res.json({ message: 'Product deleted', id: product._id });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/low-stock
// products where quantity is less than or equal to reorderLevel
export const getLowStock = async (req, res, next) => {
  try {
    const lowStockItems = await Product.aggregate([
      { $match: { $expr: { $lte: ['$quantity', '$reorderLevel'] } } },
      {
        $addFields: {
          stockValue: { $multiply: ['$price', '$quantity'] },
          id: { $toString: '$_id' }
        }
      },
      { $sort: { quantity: 1, name: 1 } }
    ]);

    res.json({ count: lowStockItems.length, lowStockItems });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/summary
// category wise report
export const getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' }
        }
      },
      { $addFields: { avgPrice: { $round: ['$avgPrice', 2] } } },
      { $sort: { totalStockValue: -1 } }
    ]);

    res.json({ categories: summary.length, summary });
  } catch (err) {
    next(err);
  }
};
