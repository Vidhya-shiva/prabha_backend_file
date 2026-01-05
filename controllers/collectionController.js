// controllers/collectionController.js
import Collection from '../models/Collection.js';

const normalize = (str) => str.trim().replace(/\s+/g, '_');
const displayName = (str) => str.replace(/_/g, ' ');
const sortQuery = { order: 1, createdAt: 1 };

// GET ALL COLLECTIONS
export const getAllCollections = async (req, res) => {
  try {
    const collections = await Collection.find().sort(sortQuery).lean();
    res.status(200).json({ success: true, data: collections });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch collections', error: e.message });
  }
};

// GET ENABLED COLLECTIONS
export const getEnabledCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ enabled: true }).sort(sortQuery).lean();
    res.status(200).json({ success: true, data: collections });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch enabled collections', error: e.message });
  }
};

// GET OFFER COLLECTIONS
export const getOfferCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ enabled: true, offerEnabled: true }).sort(sortQuery).lean();
    res.status(200).json({ success: true, data: collections });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch offer collections', error: e.message });
  }
};

// GET COLLECTION BY NAME
export const getCollectionByName = async (req, res) => {
  try {
    const name = normalize(req.params.name.replace(/-/g, ' '));
    const collection = await Collection.findOne({ normalizedName: name }).lean();

    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    res.status(200).json({ success: true, data: collection });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch collection', error: e.message });
  }
};

// CREATE COLLECTION
export const createCollection = async (req, res) => {
  try {
    const { name, enabled = true, image = '', offerEnabled = false, isDefault = false } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Collection name is required' });

    const normalizedName = normalize(name);
    if (await Collection.findOne({ normalizedName }))
      return res.status(409).json({ success: false, message: 'Collection already exists' });

    const last = await Collection.findOne().sort({ order: -1 });
    const order = last ? last.order + 1 : 0;

    const collection = await Collection.create({
      name: displayName(normalizedName),
      normalizedName,
      enabled,
      image,
      offerEnabled,
      isDefault,
      order,
    });

    res.status(201).json({ success: true, message: 'Collection created', data: collection });
  } catch (e) {
    if (e.code === 11000)
      return res.status(409).json({ success: false, message: 'Collection already exists' });

    res.status(500).json({ success: false, message: 'Failed to create collection', error: e.message });
  }
};

// UPDATE COLLECTION
export const updateCollection = async (req, res) => {
  try {
    const { id } = req.params;

    let update = { ...req.body };

    if (update.name) {
      const newNorm = normalize(update.name);
      if (await Collection.findOne({ normalizedName: newNorm, _id: { $ne: id } }))
        return res.status(409).json({ success: false, message: 'Collection name already exists' });

      update.name = displayName(newNorm);
      update.normalizedName = newNorm;
    }

    const collection = await Collection.findByIdAndUpdate(id, update, { new: true });
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    res.status(200).json({ success: true, message: 'Collection updated', data: collection });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update collection', error: e.message });
  }
};

// DELETE COLLECTION
export const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    if (collection.isDefault)
      return res.status(400).json({ success: false, message: 'Cannot delete default collections' });

    await Collection.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Collection deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete collection', error: e.message });
  }
};

// TOGGLE ENABLED
export const toggleCollectionEnabled = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    collection.enabled = !collection.enabled;
    await collection.save();

    res.status(200).json({ success: true, message: 'Toggled successfully', data: collection });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to toggle collection', error: e.message });
  }
};

// TOGGLE OFFER
export const toggleOfferEnabled = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    collection.offerEnabled = !collection.offerEnabled;
    await collection.save();

    res.status(200).json({ success: true, message: 'Offer toggled', data: collection });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to toggle offer', error: e.message });
  }
};

// BULK UPDATE (FAST)
export const bulkUpdateCollections = async (req, res) => {
  try {
    if (!Array.isArray(req.body.collections))
      return res.status(400).json({ success: false, message: 'Collections array is required' });

    const ops = req.body.collections
      .filter((c) => c.id)
      .map((c) => ({
        updateOne: {
          filter: { _id: c.id },
          update: {
            ...(c.enabled !== undefined && { enabled: c.enabled }),
            ...(c.image !== undefined && { image: c.image }),
            ...(c.offerEnabled !== undefined && { offerEnabled: c.offerEnabled }),
            ...(c.order !== undefined && { order: c.order }),
          },
        },
      }));

    await Collection.bulkWrite(ops);

    res.status(200).json({ success: true, message: 'Bulk updated successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update collections', error: e.message });
  }
};

// SEED DEFAULT COLLECTIONS
export const seedDefaultCollections = async (req, res) => {
  try {
    const defaults = ['Mens', 'Womens', 'Kids', 'Home Textiles', 'Accessories'];
    if (await Collection.countDocuments())
      return res.status(400).json({ success: false, message: 'Collections already exist' });

    const data = defaults.map((name, i) => ({
      name,
      normalizedName: normalize(name),
      enabled: true,
      image: '',
      offerEnabled: false,
      isDefault: true,
      order: i,
    }));

    const created = await Collection.insertMany(data);
    res.status(201).json({ success: true, message: 'Defaults seeded', data: created });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to seed collections', error: e.message });
  }
};
