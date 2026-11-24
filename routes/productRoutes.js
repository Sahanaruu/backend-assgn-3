import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  adjustStock,
  deleteProduct,
  getLowStock,
  getCategorySummary
} from '../controllers/productController.js';
import {
  validateCreate,
  validateUpdate,
  validateId,
  validateStockChange
} from '../middleware/validateProduct.js';

const router = express.Router();

// NOTE: /low-stock and /summary have to be above /:id
// otherwise express will treat "low-stock" as an id
router.get('/low-stock', getLowStock);
router.get('/summary', getCategorySummary);

router.route('/')
  .get(getProducts)
  .post(validateCreate, createProduct);

router.patch('/:id/stock', validateId, validateStockChange, adjustStock);

router.route('/:id')
  .get(validateId, getProductById)
  .put(validateId, validateUpdate, updateProduct)
  .delete(validateId, deleteProduct);

export default router;
