// routes/searchRoutes.js - WITH CACHE
import express from 'express';
import { cacheMiddleware } from '../middleware/cache.js';
import { smartSearch } from '../controllers/searchController.js';

const router = express.Router();

// Smart search endpoint - Cache for 3 minutes (search results can change)
router.get('/', cacheMiddleware(180), smartSearch);

export default router;