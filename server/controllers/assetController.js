import db from '../models/database.js';
import { isFiniteNumber, validateAsset } from '../validation.js';

// Get all assets for current user
export const getAllAssets = (req, res) => {
  try {
    const assets = db.prepare(
      'SELECT * FROM assets WHERE userId = ? ORDER BY createdAt DESC'
    ).all(req.userId);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

// Get single asset by ID (only if owned by user)
export const getAssetById = (req, res) => {
  try {
    const { id } = req.params;
    const asset = db.prepare(
      'SELECT * FROM assets WHERE id = ? AND userId = ?'
    ).get(id, req.userId);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
};

// Create new asset for current user
export const createAsset = (req, res) => {
  try {
    const { assetName, symbol, assetType, quantity, buyPrice, currentPrice, notes } = req.body;

    const validationError = validateAsset(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const stmt = db.prepare(`
      INSERT INTO assets (userId, assetName, symbol, assetType, quantity, buyPrice, currentPrice, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.userId,
      assetName.trim(),
      symbol.toUpperCase().trim(),
      assetType,
      quantity,
      buyPrice,
      currentPrice ?? buyPrice,
      notes?.trim() || null
    );

    const newAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
};

// Update existing asset (only if owned by user)
export const updateAsset = (req, res) => {
  try {
    const { id } = req.params;
    const { assetName, symbol, assetType, quantity, buyPrice, currentPrice, notes } = req.body;

    // Check if asset exists and belongs to user
    const existing = db.prepare(
      'SELECT * FROM assets WHERE id = ? AND userId = ?'
    ).get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const validationError = validateAsset(req.body, { partial: true });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Update only provided fields
    const updates = {
      assetName: assetName?.trim() ?? existing.assetName,
      symbol: symbol?.toUpperCase().trim() ?? existing.symbol,
      assetType: assetType ?? existing.assetType,
      quantity: quantity ?? existing.quantity,
      buyPrice: buyPrice ?? existing.buyPrice,
      currentPrice: currentPrice ?? existing.currentPrice,
      notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
    };

    const stmt = db.prepare(`
      UPDATE assets
      SET assetName = ?, symbol = ?, assetType = ?, quantity = ?, buyPrice = ?, currentPrice = ?, notes = ?
      WHERE id = ? AND userId = ?
    `);

    stmt.run(
      updates.assetName,
      updates.symbol,
      updates.assetType,
      updates.quantity,
      updates.buyPrice,
      updates.currentPrice,
      updates.notes,
      id,
      req.userId
    );

    const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    res.json(updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
};

// Delete asset (only if owned by user)
export const deleteAsset = (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare(
      'SELECT * FROM assets WHERE id = ? AND userId = ?'
    ).get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    db.prepare('DELETE FROM assets WHERE id = ? AND userId = ?').run(id, req.userId);
    res.json({ message: 'Asset deleted successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

// Batch update prices for crypto assets (for current user)
export const updateCryptoPrices = (req, res) => {
  try {
    const { prices } = req.body;

    if (!prices || typeof prices !== 'object' || Array.isArray(prices)) {
      return res.status(400).json({ error: 'prices object is required' });
    }

    const badEntry = Object.entries(prices).find(([, price]) => !(isFiniteNumber(price) && price >= 0));
    if (badEntry) {
      return res.status(400).json({ error: `price for ${badEntry[0]} must be a number >= 0` });
    }

    const updateStmt = db.prepare(`
      UPDATE assets SET currentPrice = ?
      WHERE symbol = ? AND assetType = 'crypto' AND userId = ?
    `);

    const updateMany = db.transaction((priceMap) => {
      let updated = 0;
      for (const [symbol, price] of Object.entries(priceMap)) {
        const result = updateStmt.run(price, symbol.toUpperCase(), req.userId);
        updated += result.changes;
      }
      return updated;
    });

    const updatedCount = updateMany(prices);
    res.json({ message: `Updated ${updatedCount} asset prices` });
  } catch (error) {
    console.error('Error updating crypto prices:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
};
