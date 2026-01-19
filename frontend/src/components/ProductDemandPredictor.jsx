import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Package, TrendingUp, AlertTriangle, ShoppingCart, Zap } from 'lucide-react';
import api from '../api/api';

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
      const response = await api.get('/varieties/');
      const data = response.data;
      setVarieties(data);
      if (data.length > 0) {
        setSelectedVariety(data[0].id);
      }
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadDemandForecast = async () => {
    if (!selectedVariety) return;
    
    setLoading(true);
    try {
      const response = await api.get(
        `/predictions/product-demand/${selectedVariety}?days_ahead=${forecastDays}`
      );
      const data = response.data;
      setDemandForecast(data);
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

  const getModelBadge = (modelInfo) => {
    if (!modelInfo) return null;
    
    const isProphet = modelInfo.using_prophet;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
        isProphet 
          ? 'bg-blue-100 text-blue-800 border-blue-300'
          : 'bg-gray-100 text-gray-800 border-gray-300'
      }`}>
        {isProphet && <Zap size={12} />}
        {isProphet ? 'PROPHET AI' : 'REGRESSION'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Product Demand Forecasting</h1>
          </div>
          <p className="text-gray-600">AI-powered predictions for inventory planning</p>
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
            <p className="text-gray-600">Analyzing demand patterns with AI...</p>
          </div>
        ) : demandForecast ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                  <div className="flex gap-2 items-center">
                    {getConfidenceBadge(demandForecast.confidence)}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Avg Daily Sales</p>
                <p className="text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.avg_daily_sales?.toFixed(1)} units
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  {getModelBadge(demandForecast.model_info)}
                </div>
                <p className="text-sm text-gray-600 mb-1">Predicted Total Demand</p>
                <p className="text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.total_predicted_demand} units
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Reorder Point</p>
                <p className="text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.reorder_point} units
                </p>
              </div>
            </div>

            {/* Model Info */}
            {demandForecast.model_info?.using_prophet && (
              <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm p-4 mb-6 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-gray-800">
                    Using <span className="font-bold">Facebook Prophet</span> time series AI - 
                    Captures weekly patterns and seasonality automatically
                  </p>
                </div>
              </div>
            )}

            {/* Forecast Chart with Confidence Bands */}
            {demandForecast.forecast && demandForecast.forecast.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Demand Forecast with Confidence Intervals</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={demandForecast.forecast}>
                    <defs>
                      <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
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
                      formatter={(value, name) => {
                        if (name === 'upper_bound') return [`${value} units`, 'Upper Bound'];
                        if (name === 'lower_bound') return [`${value} units`, 'Lower Bound'];
                        return [`${value} units`, 'Predicted Demand'];
                      }}
                    />
                    <Legend />
                    
                    {/* Confidence Band (if Prophet provides bounds) */}
                    {demandForecast.forecast[0]?.upper_bound && (
                      <Area
                        type="monotone"
                        dataKey="upper_bound"
                        stroke="none"
                        fill="url(#colorConfidence)"
                        fillOpacity={1}
                        name="Confidence Range"
                      />
                    )}
                    
                    {demandForecast.forecast[0]?.lower_bound && (
                      <Area
                        type="monotone"
                        dataKey="lower_bound"
                        stroke="none"
                        fill="#ffffff"
                        name=""
                      />
                    )}
                    
                    {/* Main prediction line */}
                    <Line
                      type="monotone"
                      dataKey="predicted_quantity"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Predicted Quantity"
                    />
                    
                    {/* Bounds as dashed lines */}
                    {demandForecast.forecast[0]?.upper_bound && (
                      <Line
                        type="monotone"
                        dataKey="upper_bound"
                        stroke="#93C5FD"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Upper Bound"
                      />
                    )}
                    
                    {demandForecast.forecast[0]?.lower_bound && (
                      <Line
                        type="monotone"
                        dataKey="lower_bound"
                        stroke="#93C5FD"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Lower Bound"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
                
                {/* Model Metrics */}
                <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Model Accuracy (R²)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {((demandForecast.r_squared || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Forecast Period</p>
                    <p className="text-2xl font-bold text-gray-900">{forecastDays} Days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Model Type</p>
                    <p className="text-lg font-bold text-gray-900">
                      {demandForecast.model_info?.using_prophet ? 'Prophet AI' : 'Regression'}
                    </p>
                  </div>
                </div>
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
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  AI Recommendation
                </h3>
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