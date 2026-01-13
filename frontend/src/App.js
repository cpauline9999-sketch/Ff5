import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    player_uid: '301372144',
    diamond_amount: 25
  });

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/automation/stats`);
      setStats(response.data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/automation/orders?limit=20`);
      setOrders(response.data);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/automation/topup`, formData);
      alert(`Order ${response.data.order_id} created successfully!`);
      await fetchStats();
      await fetchOrders();
    } catch (error) {
      alert(`Failed to create order: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (orderId) => {
    try {
      await axios.post(`${API}/automation/orders/${orderId}/retry`);
      alert('Order queued for retry!');
      await fetchStats();
      await fetchOrders();
    } catch (error) {
      alert(`Failed to retry: ${error.response?.data?.detail || error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'manual_pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Garena Free Fire Top-Up Automation
          </h1>
          <p className="text-gray-600">Automated diamond top-up system</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total_orders}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.queued}</div>
              <div className="text-sm text-gray-600">Queued</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="bg-orange-50 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.manual_pending}</div>
              <div className="text-sm text-gray-600">Manual Pending</div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Create Order Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6" data-testid="topup-form">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Top-Up Order</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Player UID
                  </label>
                  <input
                    type="text"
                    data-testid="player-uid-input"
                    value={formData.player_uid}
                    onChange={(e) => setFormData({ ...formData, player_uid: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter Player UID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diamond Amount
                  </label>
                  <select
                    data-testid="diamond-amount-select"
                    value={formData.diamond_amount}
                    onChange={(e) => setFormData({ ...formData, diamond_amount: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="25">25 Diamonds</option>
                    <option value="50">50 Diamonds</option>
                    <option value="100">100 Diamonds</option>
                    <option value="310">310 Diamonds</option>
                    <option value="520">520 Diamonds</option>
                    <option value="1060">1060 Diamonds</option>
                  </select>
                </div>

                <button
                  type="submit"
                  data-testid="submit-topup-button"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                >
                  {loading ? 'Creating Order...' : 'Create Order'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Test Credentials</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>UID:</strong> 301372144</p>
                  <p><strong>Expected Name:</strong> NAYAN XR</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Orders List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
                <button
                  onClick={() => { fetchStats(); fetchOrders(); }}
                  data-testid="refresh-button"
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-4" data-testid="orders-list">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No orders yet. Create your first order!</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.order_id}
                      data-testid={`order-${order.order_id}`}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-gray-600">
                              {order.order_id.substring(0, 8)}...
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            <strong>UID:</strong> {order.player_uid} | <strong>Diamonds:</strong> {order.diamond_amount}
                          </p>
                        </div>
                        {(order.status === 'failed' || order.status === 'manual_pending') && (
                          <button
                            onClick={() => handleRetry(order.order_id)}
                            data-testid={`retry-${order.order_id}`}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{order.message}</p>
                      {order.error && (
                        <p className="text-xs text-red-600 mb-2">
                          <strong>Error:</strong> {order.error}
                        </p>
                      )}
                      <div className="text-xs text-gray-500">
                        <p>Created: {new Date(order.created_at).toLocaleString()}</p>
                        {order.completed_at && (
                          <p>Completed: {new Date(order.completed_at).toLocaleString()}</p>
                        )}
                        {order.screenshots && order.screenshots.length > 0 && (
                          <p className="text-blue-600 mt-1">
                            {order.screenshots.length} screenshot(s) available
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Powered by Browserless BaaS v2 + Playwright + SolveCaptcha</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
