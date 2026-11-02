import { useState } from 'react';

// Form for creating and editing assets. The parent passes key={asset.id}
// when editing, so the form remounts (and repopulates) for each asset.
function AssetForm({ asset, onSubmit, onCancel, isEdit }) {
  const [formData, setFormData] = useState(() => ({
    assetName: asset?.assetName || '',
    symbol: asset?.symbol || '',
    assetType: asset?.assetType || 'crypto',
    quantity: asset?.quantity?.toString() || '',
    buyPrice: asset?.buyPrice?.toString() || '',
    currentPrice: asset?.currentPrice?.toString() || '',
    notes: asset?.notes || '',
  }));
  const [errors, setErrors] = useState({});

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.assetName.trim()) {
      newErrors.assetName = 'Asset name is required';
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = 'Symbol must be 10 characters or less';
    }

    const quantity = parseFloat(formData.quantity);
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    const buyPrice = parseFloat(formData.buyPrice);
    if (!formData.buyPrice || isNaN(buyPrice) || buyPrice < 0) {
      newErrors.buyPrice = 'Buy price must be 0 or greater';
    }

    // For non-crypto assets, current price is required
    if (formData.assetType !== 'crypto') {
      const currentPrice = parseFloat(formData.currentPrice);
      if (!formData.currentPrice || isNaN(currentPrice) || currentPrice < 0) {
        newErrors.currentPrice = 'Current price is required for non-crypto assets';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      assetName: formData.assetName.trim(),
      symbol: formData.symbol.toUpperCase().trim(),
      assetType: formData.assetType,
      quantity: parseFloat(formData.quantity),
      buyPrice: parseFloat(formData.buyPrice),
      currentPrice: formData.currentPrice
        ? parseFloat(formData.currentPrice)
        : parseFloat(formData.buyPrice),
      notes: formData.notes.trim() || null,
    };

    onSubmit(submitData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Asset' : 'Add New Asset'}</h2>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="asset-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assetName">Asset Name *</label>
              <input
                type="text"
                id="assetName"
                name="assetName"
                value={formData.assetName}
                onChange={handleChange}
                placeholder="e.g., Bitcoin, Apple Inc."
              />
              {errors.assetName && <span className="error">{errors.assetName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="symbol">Symbol *</label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="e.g., BTC, AAPL"
                style={{ textTransform: 'uppercase' }}
              />
              {errors.symbol && <span className="error">{errors.symbol}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assetType">Asset Type *</label>
              <select
                id="assetType"
                name="assetType"
                value={formData.assetType}
                onChange={handleChange}
              >
                <option value="crypto">Cryptocurrency</option>
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Quantity *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0.00"
                step="any"
                min="0"
              />
              {errors.quantity && <span className="error">{errors.quantity}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="buyPrice">Buy Price (USD) *</label>
              <input
                type="number"
                id="buyPrice"
                name="buyPrice"
                value={formData.buyPrice}
                onChange={handleChange}
                placeholder="0.00"
                step="any"
                min="0"
              />
              {errors.buyPrice && <span className="error">{errors.buyPrice}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="currentPrice">
                Current Price (USD) {formData.assetType !== 'crypto' && '*'}
              </label>
              <input
                type="number"
                id="currentPrice"
                name="currentPrice"
                value={formData.currentPrice}
                onChange={handleChange}
                placeholder={formData.assetType === 'crypto' ? 'Auto-updated' : '0.00'}
                step="any"
                min="0"
                disabled={formData.assetType === 'crypto' && isEdit}
              />
              {formData.assetType === 'crypto' && (
                <span className="hint">Price auto-updates for crypto</span>
              )}
              {errors.currentPrice && <span className="error">{errors.currentPrice}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes about this asset..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssetForm;
