import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const ProductDemandPredictor = () => {
  const [varieties, setVarieties] = useState([]);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [demandForecast, setDemandForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState(30);

  useEffect(() => {
    loadVarieties();
  }, []);

  const loadVarieties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/varieties/`);
      if (response.ok) {
        const data = await response.json();
        setVarieties(data);
        if (data.length > 0) {
          setSelectedVariety(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadDemandForecast = async () => {
    if (!selectedVariety) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/predictions/product-demand/${selectedVariety}?days_ahead=${forecastDays}`
      );
      if (response.ok) {
        const data = await response.json();
        setDemandForecast(data);
      }
    } catch (error) {
      console.error('Error loading demand forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVariety) {
      loadDemandForecast();
    }
  }, [selectedVariety, forecastDays]);

  const getConfidenceBadge = (confidence) => {
    const colors = {
      high: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-red-100 text-red-800 border-red-300'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[confidence] || colors.low}`}>
        {confidence?.toUpperCase()} CONFIDENCE
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Demand Forecasting</h1>
          <p className="text-gray-600">Predict future demand for specific products</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Product
              </label>
              <select
                value={selectedVariety || ''}
                onChange={(e) => setSelectedVariety(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {varieties.map((variety) => (
                  <option key={variety.id} value={variety.id}>
                    {variety.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forecast Period
              </label>
              <div className="flex gap-2">
                {[7, 14, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setForecastDays(days)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      forecastDays === days
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing demand patterns...</p>
          </div>
        ) : demandForecast ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                  {getConfidenceBadge(demandForecast.confidence)}
                </div>
                <p className="text-sm text-gray-600 mb-1">Avg Daily Sales</p>
                <p className="text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.avg_daily_sales?.toFixed(1)} units
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Predicted Total Demand</p>
                <p className="text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.total_predicted_demand} units
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Reorder Point</p>
                <p className="text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.reorder_point} units
                </p>
              </div>
            </div>

            {/* Forecast Chart */}
            {demandForecast.forecast && demandForecast.forecast.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Demand Forecast</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={demandForecast.forecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280" 
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      formatter={(value) => [`${value} units`, 'Predicted Demand']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="predicted_quantity"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Predicted Quantity"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">{demandForecast.message || 'No forecast data available'}</p>
              </div>
            )}

            {/* Recommendation */}
            {demandForecast.analytics && (
              <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">AI Recommendation</h3>
                <p className="text-gray-700 text-lg">{demandForecast.analytics.recommendation}</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Select a product to view demand forecast</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDemandPredictor;