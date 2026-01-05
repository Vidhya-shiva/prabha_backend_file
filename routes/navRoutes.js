// routes/navRoutes.js - WITH CACHE
import express from 'express';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';
import { 
  createnavItem, 
  getAllnavItem, 
  updatenavItem, 
  deletenavItem, 
  clearAllnavItems 
} from '../controllers/navController.js';

const router = express.Router();

// GET - Get all nav items - Cache for 10 minutes
router.get('/', cacheMiddleware(600), getAllnavItem);

// CREATE - Create a new nav item
router.post('/', async (req, res, next) => {
  await createnavItem(req, res, next);
  clearCache('/api/nav');
});

// UPDATE - Update a nav item
router.put('/:id', async (req, res, next) => {
  await updatenavItem(req, res, next);
  clearCache('/api/nav');
});

// DELETE - Delete a nav item
router.delete('/:id', async (req, res, next) => {
  await deletenavItem(req, res, next);
  clearCache('/api/nav');
});

// DELETE - Clear all nav items
router.delete('/', async (req, res, next) => {
  await clearAllnavItems(req, res, next);
  clearCache('/api/nav');
});

export default router;