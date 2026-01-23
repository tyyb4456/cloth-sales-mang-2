// frontend/src/components/ProductDemandPredictor.jsx - MOBILE-FIRST RESPONSIVE VERSION

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Package, TrendingUp, AlertTriangle, ShoppingCart, Zap, X } from 'lucide-react';
import api from '../api/api';

const ProductDemandPredictor = () => {
  const [varieties, setVarieties] = useState([]);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [demandForecast, setDemandForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState(30);
  const [showVarietySelector, setShowVarietySelector] = useState(false);

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
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border ${colors[confidence] || colors.low}`}>
        {confidence?.toUpperCase()} CONFIDENCE
      </span>
    );
  };

  const getModelBadge = (modelInfo) => {
    if (!modelInfo) return null;
    
    const isProphet = modelInfo.using_prophet;
    return (
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
        isProphet 
          ? 'bg-blue-100 text-blue-800 border-blue-300'
          : 'bg-gray-100 text-gray-800 border-gray-300'
      }`}>
        {isProphet && <Zap size={12} />}
        {isProphet ? 'PROPHET AI' : 'REGRESSION'}
      </span>
    );
  };

  const selectedVarietyData = varieties.find(v => v.id === selectedVariety);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* MOBILE-FIRST HEADER */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600 shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Demand Forecasting</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">AI-powered predictions for inventory planning</p>
        </div>

        {/* MOBILE-FIRST CONTROLS */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Product Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Product
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowVarietySelector(!showVarietySelector)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedVarietyData ? selectedVarietyData.name : 'Select a product...'}
                  </span>
                  <svg className="w-5 h-5 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown */}
                {showVarietySelector && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {varieties.map((variety) => (
                      <button
                        key={variety.id}
                        onClick={() => {
                          setSelectedVariety(variety.id);
                          setShowVarietySelector(false);
                        }}
                        className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-blue-50 transition text-sm sm:text-base ${
                          selectedVariety === variety.id ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="font-medium">{variety.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{variety.measurement_unit}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Forecast Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forecast Period
              </label>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setForecastDays(days)}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition active:scale-95 ${
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
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Analyzing demand patterns with AI...</p>
          </div>
        ) : demandForecast ? (
          <>
            {/* MOBILE-FIRST SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600 shrink-0" />
                  <div className="flex gap-2 items-center flex-wrap justify-end">
                    {getConfidenceBadge(demandForecast.confidence)}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Avg Daily Sales</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.avg_daily_sales?.toFixed(1)} units
                </p>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-600 shrink-0" />
                  {getModelBadge(demandForecast.model_info)}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Predicted Total Demand</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.total_predicted_demand} units
                </p>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-orange-600 shrink-0" />
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Reorder Point</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {demandForecast.analytics?.reorder_point} units
                </p>
              </div>
            </div>

            {/* MODEL INFO */}
            {demandForecast.model_info?.using_prophet && (
              <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-gray-800">
                    Using <span className="font-bold">Facebook Prophet</span> time series AI - 
                    Captures weekly patterns and seasonality automatically
                  </p>
                </div>
              </div>
            )}

            {/* FORECAST CHART */}
            {demandForecast.forecast && demandForecast.forecast.length > 0 ? (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Demand Forecast with Confidence Intervals</h2>
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
                    
                    {/* Confidence Band */}
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
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Model Accuracy (R²)</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {((demandForecast.r_squared || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Forecast Period</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{forecastDays} Days</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Model Type</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {demandForecast.model_info?.using_prophet ? 'Prophet AI' : 'Regression'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-200">
                <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-sm sm:text-base text-gray-600">{demandForecast.message || 'No forecast data available'}</p>
              </div>
            )}

            {/* RECOMMENDATION */}
            {demandForecast.analytics && (
              <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-blue-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  AI Recommendation
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-gray-700">{demandForecast.analytics.recommendation}</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-200">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-600">Select a product to view demand forecast</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDemandPredictor;