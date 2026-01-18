import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Sun, Moon } from 'lucide-react';
import api from '../api/api';

// ==================== UTILITY FUNCTIONS ====================
const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  return { startDate: start, endDate: end };
};

const formatCurrency = (value) => `₹${value.toLocaleString()}`;

const CHART_COLORS = {
  supplied: '#6B7C93',   // Muted blue-gray
  used: '#8B6F6F',       // Muted rose
  returned: '#9C8A5E',   // Muted amber
};


const InventoryMovementChart = ({ data, isDark }) => (
  <div
    className={`rounded-xl p-6 border
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
  >
    <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
      Inventory Movement Trends
    </h3>

    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        
        <CartesianGrid
          vertical={false}
          stroke={isDark ? '#1F2937' : '#E5E7EB'}
          strokeDasharray="2 6"
        />

        <XAxis
          dataKey="date"
          stroke={isDark ? '#6B7280' : '#9CA3AF'}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          stroke={isDark ? '#6B7280' : '#9CA3AF'}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#020617' : '#FFFFFF',
            border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
            borderRadius: 10,
            fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
          cursor={{ stroke: isDark ? '#334155' : '#CBD5E1', strokeDasharray: '3 3' }}
        />

        <Legend
          iconType="line"
          wrapperStyle={{
            fontSize: 12,
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        />

        <Area
          type="monotone"
          dataKey="supplied"
          stroke={CHART_COLORS.supplied}
          strokeWidth={1.8}
          fill="none"
          dot={false}
          name="Supplied"
        />

        <Area
          type="monotone"
          dataKey="used"
          stroke={CHART_COLORS.used}
          strokeWidth={1.8}
          fill="none"
          dot={false}
          name="Used"
        />

        <Area
          type="monotone"
          dataKey="returned"
          stroke={CHART_COLORS.returned}
          strokeWidth={1.8}
          fill="none"
          dot={false}
          name="Returned"
        />

      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const PIE_COLORS = [
  '#7B8FA6', // Muted blue
  '#8FAF9B', // Sage green
  '#C5B79A', // Soft sand
  '#A79DBB', // Dusty lavender
  '#8FB3B3', // Soft teal
  '#B99B9B', // Muted rose
];



const StockUtilizationChart = ({ data, isDark }) => {
  return (
    <div
      className={`rounded-xl p-6 border
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
    >
      <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Stock Utilization Overview
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={88}
              paddingAngle={1}
              stroke={isDark ? '#020617' : '#FFFFFF'}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>

            {/* Apple-style tooltip */}
<Tooltip
  formatter={(value, name) => [`${value.toFixed(1)} units`, name]}
  contentStyle={{
    backgroundColor: isDark ? '#020617' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
    borderRadius: 10,
    fontSize: 12,
  }}
  labelStyle={{
    color: isDark ? '#E5E7EB' : '#111827',
  }}
  itemStyle={{
    color: isDark ? '#E5E7EB' : '#111827',
  }}
  cursor={false}
/>

          </PieChart>
        </ResponsiveContainer>

        {/* Minimal legend */}
        <div className="flex flex-col justify-center space-y-3">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span
                  className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  {item.name}
                </span>
              </div>

              <span
                className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}
              >
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BAR_COLORS = {
  supplied: '#7B8FA6', // Muted steel blue
  returned: '#9B8E6A', // Muted sand
};

const HOVER_COLORS = {
  supplied: '#6A7D95', // Slightly darker on hover
  returned: '#8C7D59',
};




const SupplierPerformanceChart = ({ data, isDark }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <div className={`rounded-xl p-6 border
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Supplier Performance
      </h2>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          layout="vertical"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <CartesianGrid
            stroke={isDark ? '#374151' : '#E5E7EB'}
            strokeDasharray="2 6"
            vertical={false}
          />

          <XAxis
            type="number"
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            dataKey="name"
            type="category"
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
            width={100}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={(value, name) => [formatCurrency(value), name]}
            contentStyle={{
              backgroundColor: isDark ? '#020617' : '#FFFFFF',
              border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            }}
            labelStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
            itemStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
          />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
            }}
          />

          {/* Supplied */}
          <Bar
            dataKey="supplied"
            radius={[0, 8, 8, 0]}
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`supplied-${index}`}
                fill={
                  activeIndex === index
                    ? HOVER_COLORS.supplied
                    : BAR_COLORS.supplied
                }
              />
            ))}
          </Bar>

          {/* Returned */}
          <Bar
            dataKey="returned"
            radius={[0, 8, 8, 0]}
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`returned-${index}`}
                fill={
                  activeIndex === index
                    ? HOVER_COLORS.returned
                    : BAR_COLORS.returned
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const BAR_COLOR = '#7B8FA6';        // Muted steel blue
const HOVER_COLOR = '#6A7D95';      // Slightly darker on hover


const VarietyTurnoverChart = ({ data, isDark }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <div className={`rounded-xl p-6 border
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Product Turnover Rate
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <CartesianGrid
            strokeDasharray="2 6"
            stroke={isDark ? '#374151' : '#E5E7EB'}
          />

          <XAxis
            dataKey="name"
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={100}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
            contentStyle={{
              backgroundColor: isDark ? '#020617' : '#FFFFFF',
              border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            }}
            labelStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
            itemStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
          />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
            }}
          />

          <Bar
            dataKey="turnoverRate"
            radius={[8, 8, 0, 0]}
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={activeIndex === index ? HOVER_COLOR : BAR_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


const LINE_COLORS = {
  totalStock: '#7B8FA6',    // Muted steel blue
  usedStock: '#9B8E6A',     // Muted sand
  remainingStock: '#8FAF9B', // Soft sage green
};


const DailyStockFlowChart = ({ data, isDark }) => {
  return (
    <div className={`rounded-xl p-6 border
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Daily Stock Flow
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="2 6"
            stroke={isDark ? '#374151' : '#E5E7EB'}
          />

          <XAxis
            dataKey="date"
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={(value, name) => [value.toLocaleString(), name]}
            contentStyle={{
              backgroundColor: isDark ? '#020617' : '#FFFFFF',
              border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            }}
            labelStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
            itemStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
          />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
            }}
          />

          <Line
            type="monotone"
            dataKey="totalStock"
            stroke={LINE_COLORS.totalStock}
            strokeWidth={1.8}
            dot={{ r: 3 }}
            name="Total Stock"
          />

          <Line
            type="monotone"
            dataKey="usedStock"
            stroke={LINE_COLORS.usedStock}
            strokeWidth={1.8}
            dot={{ r: 3 }}
            name="Stock Used"
          />

          <Line
            type="monotone"
            dataKey="remainingStock"
            stroke={LINE_COLORS.remainingStock}
            strokeWidth={1.8}
            dot={{ r: 3 }}
            name="Remaining"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};


const RADAR_COLOR = '#7B8FA6'; // Muted steel blue


const StockHealthRadarChart = ({ data, isDark }) => {
  return (
    <div className={`rounded-xl p-6 border
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Stock Health Indicators
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid
            stroke={isDark ? '#374151' : '#E5E7EB'}
          />

          <PolarAngleAxis
            dataKey="metric"
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            stroke={isDark ? '#6B7280' : '#9CA3AF'}
            tick={{ fontSize: 11 }}
          />

          <Radar
            name="Health Score"
            dataKey="score"
            stroke={RADAR_COLOR}
            strokeWidth={1.8}
            fill={RADAR_COLOR}
            fillOpacity={0.15} // very soft
          />

          <Tooltip
            formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
            contentStyle={{
              backgroundColor: isDark ? '#020617' : '#FFFFFF',
              border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            }}
            labelStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
            itemStyle={{
              color: isDark ? '#E5E7EB' : '#111827',
            }}
          />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};


// ==================== MAIN ANALYTICS DASHBOARD ====================
const InventoryAnalyticsDashboard = ({ timeRange, onTimeRangeChange }) => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    // Initialize from system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDark(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'} mx-auto mb-4`} />
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading inventory analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="space-y-6">
      {/* Section Header with Theme Toggle */}
      <div className={`${isDark ? 'bg-linear-to-r from-gray-800 to-gray-700' : 'bg-linear-to-r from-blue-50 to-indigo-50'} rounded-xl p-6 border ${isDark ? 'border-gray-700' : 'border-blue-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Inventory Analytics</h2>
            <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Comprehensive stock movement and utilization insights</p>
          </div>
          
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-lg transition-colors ${
              isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryMovementChart data={analyticsData.charts.movementData} isDark={isDark} />
        <StockUtilizationChart data={analyticsData.charts.utilizationData} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupplierPerformanceChart data={analyticsData.charts.supplierData} isDark={isDark} />
        <VarietyTurnoverChart data={analyticsData.charts.varietyData} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyStockFlowChart data={analyticsData.charts.dailyFlowData} isDark={isDark} />
        <StockHealthRadarChart data={analyticsData.charts.healthData} isDark={isDark} />
      </div>
    </div>
  );
};

export default InventoryAnalyticsDashboard;