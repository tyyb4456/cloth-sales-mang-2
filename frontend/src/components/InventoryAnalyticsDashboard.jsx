import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Package, TrendingUp, TrendingDown, AlertTriangle,
  RefreshCw, Truck, ShoppingCart, DollarSign,
  Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import api from '../api/api';

// ==================== UTILITY FUNCTIONS ====================
const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  return { startDate: start, endDate: end };
};

const formatCurrency = (value) => `₹${value.toLocaleString()}`;



// ==================== INVENTORY MOVEMENT CHART ====================
const InventoryMovementChart = ({ data }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <h3 className="text-lg font-bold text-gray-900 mb-4">Inventory Movement Trends</h3>
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSupplied" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="supplied"
          stroke="#3B82F6"
          fillOpacity={1}
          fill="url(#colorSupplied)"
          name="Supplied"
        />
        <Area
          type="monotone"
          dataKey="used"
          stroke="#EF4444"
          fillOpacity={1}
          fill="url(#colorUsed)"
          name="Used"
        />
        <Area
          type="monotone"
          dataKey="returned"
          stroke="#F59E0B"
          fillOpacity={1}
          fill="url(#colorReturned)"
          name="Returned"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// ==================== STOCK UTILIZATION CHART ====================
const StockUtilizationChart = ({ data }) => {
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Stock Utilization Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value.toFixed(1)} units`} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="flex flex-col justify-center space-y-3">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {item.value.toFixed(1)} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== SUPPLIER PERFORMANCE CHART ====================
const SupplierPerformanceChart = ({ data }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <h3 className="text-lg font-bold text-gray-900 mb-4">Supplier Performance</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} width={100} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
          formatter={(value) => formatCurrency(value)}
        />
        <Legend />
        <Bar dataKey="supplied" fill="#3B82F6" name="Total Supplied" radius={[0, 4, 4, 0]} />
        <Bar dataKey="returned" fill="#F59E0B" name="Returned" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ==================== VARIETY TURNOVER CHART ====================
const VarietyTurnoverChart = ({ data }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <h3 className="text-lg font-bold text-gray-900 mb-4">Product Turnover Rate</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={100}
        />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Bar dataKey="turnoverRate" fill="#10B981" name="Turnover Rate (%)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ==================== DAILY STOCK FLOW CHART ====================
const DailyStockFlowChart = ({ data }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Stock Flow</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="totalStock"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Total Stock"
        />
        <Line
          type="monotone"
          dataKey="usedStock"
          stroke="#EF4444"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Stock Used"
        />
        <Line
          type="monotone"
          dataKey="remainingStock"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Remaining"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// ==================== STOCK HEALTH RADAR CHART ====================
const StockHealthRadarChart = ({ data }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <h3 className="text-lg font-bold text-gray-900 mb-4">Stock Health Indicators</h3>
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="metric" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Radar name="Health Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
        <Tooltip />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  </div>
);

// ==================== MAIN ANALYTICS DASHBOARD ====================
const InventoryAnalyticsDashboard = ({ timeRange, onTimeRangeChange }) => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(timeRange);
      
      const [inventoryRes, returnsRes, salesRes, varietiesRes] = await Promise.all([
        api.get('/supplier/inventory'),
        api.get('/supplier/returns'),
        api.get('/sales/'),
        api.get('/varieties/')
      ]);

      const allInventory = inventoryRes.data;
      const allReturns = returnsRes.data;
      const allSales = salesRes.data;
      const varieties = varietiesRes.data;

      // Filter by date range
      const inventory = allInventory.filter(i => {
        const date = new Date(i.supply_date);
        return date >= startDate && date <= endDate;
      });

      const returns = allReturns.filter(r => {
        const date = new Date(r.return_date);
        return date >= startDate && date <= endDate;
      });

      const sales = allSales.filter(s => {
        const date = new Date(s.sale_date);
        return date >= startDate && date <= endDate;
      });

      // Calculate metrics
      const totalSupplied = inventory.reduce((sum, i) => sum + parseFloat(i.quantity), 0);
      const totalUsed = inventory.reduce((sum, i) => sum + parseFloat(i.quantity_used), 0);
      const totalReturned = returns.reduce((sum, r) => sum + parseFloat(r.quantity), 0);
      const totalRemaining = inventory.reduce((sum, i) => sum + parseFloat(i.quantity_remaining), 0);

      const totalSuppliedValue = inventory.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);
      const totalReturnedValue = returns.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);

      // Calculate trends (compare with previous period)
      const prevPeriodStart = new Date(startDate);
      prevPeriodStart.setDate(prevPeriodStart.getDate() - timeRange);
      
      const prevInventory = allInventory.filter(i => {
        const date = new Date(i.supply_date);
        return date >= prevPeriodStart && date < startDate;
      });

      const prevTotalSupplied = prevInventory.reduce((sum, i) => sum + parseFloat(i.quantity), 0);
      const suppliedTrend = prevTotalSupplied > 0 
        ? ((totalSupplied - prevTotalSupplied) / prevTotalSupplied) * 100 
        : 0;

      // Prepare chart data
      const movementData = prepareMovementData(inventory, returns, sales, startDate, endDate);
      const utilizationData = prepareUtilizationData(totalSupplied, totalUsed, totalReturned, totalRemaining);
      const supplierData = prepareSupplierData(inventory, returns);
      const varietyData = prepareVarietyTurnover(varieties, inventory, sales);
      const dailyFlowData = prepareDailyFlow(inventory, sales, startDate, endDate);
      const healthData = prepareHealthData(totalSupplied, totalUsed, totalReturned, totalRemaining);

      setAnalyticsData({
        metrics: {
          totalSupplied,
          totalUsed,
          totalReturned,
          totalRemaining,
          totalSuppliedValue,
          totalReturnedValue,
          suppliedTrend,
          utilizationRate: totalSupplied > 0 ? (totalUsed / totalSupplied) * 100 : 0,
          returnRate: totalSupplied > 0 ? (totalReturned / totalSupplied) * 100 : 0
        },
        charts: {
          movementData,
          utilizationData,
          supplierData,
          varietyData,
          dailyFlowData,
          healthData
        }
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for data preparation
  const prepareMovementData = (inventory, returns, sales, startDate, endDate) => {
    const dataMap = {};
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dataMap[dateKey] = {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        supplied: 0,
        used: 0,
        returned: 0
      };
    }

    inventory.forEach(i => {
      const dateKey = i.supply_date;
      if (dataMap[dateKey]) {
        dataMap[dateKey].supplied += parseFloat(i.quantity);
      }
    });

    sales.forEach(s => {
      if (s.stock_type === 'new_stock') {
        const dateKey = s.sale_date;
        if (dataMap[dateKey]) {
          dataMap[dateKey].used += parseFloat(s.quantity);
        }
      }
    });

    returns.forEach(r => {
      const dateKey = r.return_date;
      if (dataMap[dateKey]) {
        dataMap[dateKey].returned += parseFloat(r.quantity);
      }
    });

    return Object.values(dataMap);
  };

  const prepareUtilizationData = (supplied, used, returned, remaining) => {
    const total = supplied || 1;
    return [
      { name: 'Used', value: used, percentage: (used / total) * 100 },
      { name: 'Remaining', value: remaining, percentage: (remaining / total) * 100 },
      { name: 'Returned', value: returned, percentage: (returned / total) * 100 }
    ];
  };

  const prepareSupplierData = (inventory, returns) => {
    const supplierMap = {};
    
    inventory.forEach(i => {
      if (!supplierMap[i.supplier_name]) {
        supplierMap[i.supplier_name] = { name: i.supplier_name, supplied: 0, returned: 0 };
      }
      supplierMap[i.supplier_name].supplied += parseFloat(i.total_amount);
    });

    returns.forEach(r => {
      if (supplierMap[r.supplier_name]) {
        supplierMap[r.supplier_name].returned += parseFloat(r.total_amount);
      }
    });

    return Object.values(supplierMap).slice(0, 5);
  };

  const prepareVarietyTurnover = (varieties, inventory, sales) => {
    const varietyMap = {};
    
    varieties.forEach(v => {
      varietyMap[v.id] = {
        name: v.name,
        supplied: 0,
        sold: 0,
        turnoverRate: 0
      };
    });

    inventory.forEach(i => {
      if (varietyMap[i.variety_id]) {
        varietyMap[i.variety_id].supplied += parseFloat(i.quantity);
      }
    });

    sales.forEach(s => {
      if (s.stock_type === 'new_stock' && varietyMap[s.variety_id]) {
        varietyMap[s.variety_id].sold += parseFloat(s.quantity);
      }
    });

    Object.values(varietyMap).forEach(v => {
      v.turnoverRate = v.supplied > 0 ? (v.sold / v.supplied) * 100 : 0;
    });

    return Object.values(varietyMap)
      .filter(v => v.supplied > 0)
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, 5);
  };

  const prepareDailyFlow = (inventory, sales, startDate, endDate) => {
    const dataMap = {};
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dataMap[dateKey] = {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalStock: 0,
        usedStock: 0,
        remainingStock: 0
      };
    }

    // Cumulative calculation
    let cumulativeStock = 0;
    let cumulativeUsed = 0;

    Object.keys(dataMap).sort().forEach(dateKey => {
      inventory.forEach(i => {
        if (i.supply_date <= dateKey) {
          cumulativeStock += parseFloat(i.quantity);
        }
      });

      sales.forEach(s => {
        if (s.sale_date <= dateKey && s.stock_type === 'new_stock') {
          cumulativeUsed += parseFloat(s.quantity);
        }
      });

      dataMap[dateKey].totalStock = cumulativeStock;
      dataMap[dateKey].usedStock = cumulativeUsed;
      dataMap[dateKey].remainingStock = cumulativeStock - cumulativeUsed;
    });

    return Object.values(dataMap);
  };

  const prepareHealthData = (supplied, used, returned, remaining) => {
    const total = supplied || 1;
    
    return [
      { metric: 'Availability', score: (remaining / total) * 100 },
      { metric: 'Utilization', score: (used / total) * 100 },
      { metric: 'Quality', score: ((total - returned) / total) * 100 },
      { metric: 'Turnover', score: (used / total) * 100 },
      { metric: 'Efficiency', score: ((total - returned - remaining) / total) * 100 }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Inventory Analytics</h2>
        <p className="text-gray-600">Comprehensive stock movement and utilization insights</p>
      </div>

   

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryMovementChart data={analyticsData.charts.movementData} />
        <StockUtilizationChart data={analyticsData.charts.utilizationData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupplierPerformanceChart data={analyticsData.charts.supplierData} />
        <VarietyTurnoverChart data={analyticsData.charts.varietyData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyStockFlowChart data={analyticsData.charts.dailyFlowData} />
        <StockHealthRadarChart data={analyticsData.charts.healthData} />
      </div>
    </div>
  );
};

export default InventoryAnalyticsDashboard;