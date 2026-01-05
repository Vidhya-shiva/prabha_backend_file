// routes/collectionRoutes.js - WITH CACHE
import express from 'express';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';
import {
  getAllCollections,
  getEnabledCollections,
  getOfferCollections,
  getCollectionByName,
  createCollection,
  updateCollection,
  deleteCollection,
  toggleCollectionEnabled,
  toggleOfferEnabled,
  bulkUpdateCollections,
  seedDefaultCollections,
} from '../controllers/collectionController.js';

const router = express.Router();

// ========================
// PUBLIC ROUTES - With Cache
// ========================

// Get all collections - Cache for 10 minutes
router.get('/', cacheMiddleware(600), getAllCollections);

// Get enabled collections - Cache for 5 minutes
router.get('/enabled', cacheMiddleware(300), getEnabledCollections);

// Get offer collections - Cache for 5 minutes
router.get('/offers', cacheMiddleware(300), getOfferCollections);

// Get single collection by name - Cache for 10 minutes
router.get('/:name', cacheMiddleware(600), getCollectionByName);

// ========================
// ADMIN ROUTES - Clear cache after modifications
// ========================

// Create collection
router.post('/', async (req, res, next) => {
  await createCollection(req, res, next);
  clearCache('/api/collections');
});

// Update collection
router.put('/:id', async (req, res, next) => {
  await updateCollection(req, res, next);
  clearCache('/api/collections');
});

// Delete collection
router.delete('/:id', async (req, res, next) => {
  await deleteCollection(req, res, next);
  clearCache('/api/collections');
});

// Toggle enabled status
router.patch('/:id/toggle-enabled', async (req, res, next) => {
  await toggleCollectionEnabled(req, res, next);
  clearCache('/api/collections');
});

// Toggle offer status
router.patch('/:id/toggle-offer', async (req, res, next) => {
  await toggleOfferEnabled(req, res, next);
  clearCache('/api/collections');
});

// Bulk update collections
router.post('/bulk-update', async (req, res, next) => {
  await bulkUpdateCollections(req, res, next);
  clearCache('/api/collections');
});

// Seed default collections
router.post('/seed', async (req, res, next) => {
  await seedDefaultCollections(req, res, next);
  clearCache('/api/collections');
});

export default router;