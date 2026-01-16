import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Zap, Package, ShoppingCart, Lightbulb, Calendar, Target, Award } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const PredictionsDashboard = () => {
  const [forecastData, setForecastData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [insights, setInsights] = useState(null);
  const [reorderRecs, setReorderRecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecastDays, setForecastDays] = useState(30);

  useEffect(() => {
    loadPredictions();
  }, [forecastDays]);

  const loadPredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [forecastRes, trendsRes, insightsRes, reorderRes] = await Promise.all([
        fetch(`${API_BASE_URL}/predictions/revenue-forecast?days_ahead=${forecastDays}`),
        fetch(`${API_BASE_URL}/predictions/sales-trends?days=30`),
        fetch(`${API_BASE_URL}/predictions/smart-insights?days=30`),
        fetch(`${API_BASE_URL}/predictions/reorder-recommendations`)
      ]);

      if (!forecastRes.ok || !trendsRes.ok || !insightsRes.ok || !reorderRes.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const [forecast, trends, insights, reorder] = await Promise.all([
        forecastRes.json(),
        trendsRes.json(),
        insightsRes.json(),
        reorderRes.json()
      ]);

      setForecastData(forecast);
      setTrends(trends);
      setInsights(insights);
      setReorderRecs(reorder);
    } catch (err) {
      setError('Failed to load predictions. Ensure you have sufficient historical data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-red-200 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Unable to Generate Predictions</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={loadPredictions}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getConfidenceBadge = (confidence) => {
    const colors = {
      high: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-red-100 text-red-800 border-red-300'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[confidence] || colors.low}`}>
        {confidence?.toUpperCase()} CONFIDENCE
      </span>
    );
  };

  const getTrendIcon = (trend) => {
    if (trend === 'upward') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (trend === 'downward') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <div className="w-5 h-5 bg-gray-400 rounded-full" />;
  };

  const getInsightIcon = (type) => {
    if (type === 'positive') return <Award className="w-6 h-6 text-green-600" />;
    if (type === 'warning') return <AlertCircle className="w-6 h-6 text-yellow-600" />;
    return <Lightbulb className="w-6 h-6 text-blue-600" />;
  };

  // Combine historical and forecast data for visualization
  const combinedChartData = [
    ...((forecastData?.historical_data || []).map(d => ({ ...d, type: 'historical' }))),
    ...((forecastData?.forecast || []).map(d => ({ 
      date: d.date, 
      revenue: d.predicted_revenue, 
      type: 'forecast' 
    })))
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Predictions & Insights</h1>
          </div>
          <p className="text-gray-600">Machine learning powered forecasts and smart recommendations</p>
        </div>

        {/* Forecast Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Forecast Period:</span>
            </div>
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
                  {days} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Forecast Chart */}
        {forecastData && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Revenue Forecast</h2>
                  <p className="text-sm text-gray-600">
                    Predicted total: ₹{Math.round(forecastData.summary?.total_predicted_revenue || 0).toLocaleString()}
                  </p>
                </div>
                {getConfidenceBadge(forecastData.confidence)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={combinedChartData}>
                <defs>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  formatter={(value) => [`₹${value?.toLocaleString()}`, 'Revenue']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHistorical)"
                  name="Historical Revenue"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Model Accuracy (R²)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((forecastData.r_squared || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Daily Predicted</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{Math.round(forecastData.summary?.avg_daily_predicted || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Forecast Period</p>
                <p className="text-2xl font-bold text-gray-900">{forecastDays} Days</p>
              </div>
            </div>
          </div>
        )}

        {/* Trends & Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales Trends */}
          {trends && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Trends Analysis</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(trends.revenue_trend?.trend)}
                    <div>
                      <p className="font-medium text-gray-900">Revenue Trend</p>
                      <p className="text-sm text-gray-600 capitalize">{trends.revenue_trend?.trend || 'unknown'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{trends.revenue_trend?.strength || 0}%</p>
                    <p className="text-xs text-gray-600">Strength</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(trends.profit_trend?.trend)}
                    <div>
                      <p className="font-medium text-gray-900">Profit Trend</p>
                      <p className="text-sm text-gray-600 capitalize">{trends.profit_trend?.trend || 'unknown'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{trends.profit_trend?.strength || 0}%</p>
                    <p className="text-xs text-gray-600">Strength</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-1">Growth Rate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {(trends.growth_rate || 0) > 0 ? '+' : ''}{(trends.growth_rate || 0).toFixed(1)}%
                  </p>
                </div>

                {trends.seasonality?.has_seasonality && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-purple-900 mb-2">Seasonal Pattern Detected</p>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-purple-700">Best Day:</p>
                        <p className="font-bold text-purple-900">{trends.seasonality.best_day}</p>
                      </div>
                      <div>
                        <p className="text-purple-700">Worst Day:</p>
                        <p className="font-bold text-purple-900">{trends.seasonality.worst_day}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Smart Insights */}
          {insights && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Smart Insights</h2>
              
              <div className="space-y-3">
                {insights.insights?.length > 0 ? (
                  insights.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'positive'
                          ? 'bg-green-50 border-green-500'
                          : insight.type === 'warning'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                          <p className="text-sm text-gray-700">{insight.message}</p>
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                            insight.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : insight.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {insight.priority?.toUpperCase()} PRIORITY
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Lightbulb className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No insights available yet. More data needed.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reorder Recommendations */}
        {reorderRecs && reorderRecs.recommendations?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-linear-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Smart Reorder Recommendations</h2>
                  <p className="text-sm text-gray-600">AI-calculated optimal inventory levels</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Avg Daily Sales</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Reorder Point</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Recommended Order</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Days of Stock</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reorderRecs.recommendations.slice(0, 10).map((rec, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{rec.variety_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {rec.avg_daily_sales.toFixed(1)} units
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                          {rec.reorder_point} units
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-bold">
                          {rec.optimal_order_quantity} units
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {rec.days_of_stock} days
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          rec.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionsDashboard;