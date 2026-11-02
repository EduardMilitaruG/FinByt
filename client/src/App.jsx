import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import PortfolioSummary from './components/PortfolioSummary';
import AssetTable from './components/AssetTable';
import AssetForm from './components/AssetForm';
import DeleteConfirm from './components/DeleteConfirm';
import Login from './components/Login';
import { assetApi } from './services/api';
import priceService from './services/priceService';
import './App.css';

// Price refresh interval (5 minutes)
const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000;

function Dashboard() {
  const { user, logout } = useAuth();

  // State
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Fetch all assets from API
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assetApi.getAll();
      setAssets(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load assets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch live prices for crypto assets
  const refreshPrices = useCallback(async () => {
    try {
      setPriceLoading(true);
      const result = await priceService.getPortfolioPrices();

      if (result.prices && Object.keys(result.prices).length > 0) {
        // Update local state with new prices
        setAssets((current) =>
          current.map((asset) => {
            if (asset.assetType === 'crypto' && result.prices[asset.symbol]) {
              return { ...asset, currentPrice: result.prices[asset.symbol] };
            }
            return asset;
          })
        );
        setLastPriceUpdate(new Date());
      }
    } catch (err) {
      console.error('Error refreshing prices:', err);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Fetch prices after assets are loaded
  useEffect(() => {
    if (assets.length > 0 && !loading) {
      refreshPrices();
    }
  }, [loading]);

  // Set up auto-refresh for prices
  useEffect(() => {
    const interval = setInterval(refreshPrices, PRICE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  // Handle adding new asset
  const handleAddAsset = async (assetData) => {
    try {
      const newAsset = await assetApi.create(assetData);
      setAssets((current) => [newAsset, ...current]);
      setShowForm(false);

      // If it's a crypto asset, refresh prices to get current price
      if (assetData.assetType === 'crypto') {
        setTimeout(refreshPrices, 500);
      }
    } catch (err) {
      console.error('Error creating asset:', err);
      alert('Failed to create asset. Please try again.');
    }
  };

  // Handle updating asset
  const handleUpdateAsset = async (assetData) => {
    try {
      const updated = await assetApi.update(editingAsset.id, assetData);
      setAssets((current) =>
        current.map((a) => (a.id === editingAsset.id ? updated : a))
      );
      setEditingAsset(null);

      // Refresh prices if crypto
      if (assetData.assetType === 'crypto') {
        setTimeout(refreshPrices, 500);
      }
    } catch (err) {
      console.error('Error updating asset:', err);
      alert('Failed to update asset. Please try again.');
    }
  };

  // Handle deleting asset
  const handleDeleteAsset = async (id) => {
    try {
      await assetApi.delete(id);
      setAssets((current) => current.filter((a) => a.id !== id));
      setDeletingAsset(null);
    } catch (err) {
      console.error('Error deleting asset:', err);
      alert('Failed to delete asset. Please try again.');
    }
  };

  // Open edit form
  const handleEdit = (asset) => {
    setEditingAsset(asset);
  };

  // Open delete confirmation
  const handleDelete = (asset) => {
    setDeletingAsset(asset);
  };

  // Format time since last update
  const formatLastUpdate = () => {
    if (!lastPriceUpdate) return 'Never';
    return lastPriceUpdate.toLocaleTimeString();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>FinByt Portfolio</h1>
        <div className="header-actions">
          <div className="price-status">
            <span className="status-label">Prices updated:</span>
            <span className="status-time">{formatLastUpdate()}</span>
            <button
              className="btn-refresh"
              onClick={refreshPrices}
              disabled={priceLoading}
            >
              {priceLoading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Add Asset
          </button>
          <button className="btn-logout" onClick={logout}>
            Logout ({user?.email})
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-banner">{error}</div>}

        <PortfolioSummary assets={assets} />

        <div className="table-section">
          <h2>Holdings</h2>
          <AssetTable
            assets={assets}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>
      </main>

      {/* Add Asset Form */}
      {showForm && (
        <AssetForm
          onSubmit={handleAddAsset}
          onCancel={() => setShowForm(false)}
          isEdit={false}
        />
      )}

      {/* Edit Asset Form */}
      {editingAsset && (
        <AssetForm
          key={editingAsset.id}
          asset={editingAsset}
          onSubmit={handleUpdateAsset}
          onCancel={() => setEditingAsset(null)}
          isEdit={true}
        />
      )}

      {/* Delete Confirmation */}
      {deletingAsset && (
        <DeleteConfirm
          asset={deletingAsset}
          onConfirm={handleDeleteAsset}
          onCancel={() => setDeletingAsset(null)}
        />
      )}

      <footer className="app-footer">
        <p>Crypto prices powered by CoinGecko API. Prices refresh every 5 minutes.</p>
      </footer>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
