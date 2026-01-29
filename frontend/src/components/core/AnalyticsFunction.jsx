import api from '../../api/api'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Award, AlertCircle, Users, Calendar } from 'lucide-react';


const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};


export const fetchAnalyticsByDateRange = async (startDate, endDate) => {
  try {
    const [salesRes, inventoryRes, returnsRes, varietiesRes] = await Promise.all([
      api.get('/sales/'),
      api.get('/supplier/inventory'),
      api.get('/supplier/returns'),
      api.get('/varieties/')
    ]);

    const [allSales, allInventory, allReturns, varieties] = [
      salesRes.data,
      inventoryRes.data,
      returnsRes.data,
      varietiesRes.data
    ];

    const sales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const inventory = allInventory.filter(i => {
      const supplyDate = new Date(i.supply_date);
      supplyDate.setHours(0, 0, 0, 0);
      return supplyDate >= startDate && supplyDate <= endDate;
    });

    const returns = allReturns.filter(r => {
      const returnDate = new Date(r.return_date);
      returnDate.setHours(0, 0, 0, 0);
      return returnDate >= startDate && returnDate <= endDate;
    });

    const varietyMap = {};
    varieties.forEach(v => {
      varietyMap[v.id] = v;
    });

    const totalRevenue = sales.reduce((sum, sale) =>
      sum + (parseFloat(sale.selling_price) * parseFloat(sale.quantity)), 0
    );

    const totalProfit = sales.reduce((sum, sale) =>
      sum + parseFloat(sale.profit), 0
    );

    const totalSales = sales.length;

    const totalItemsSold = sales.reduce((sum, sale) => {
      const variety = varietyMap[sale.variety_id];
      return sum + getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
    }, 0);

    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const midPoint = Math.floor(days / 2);
    const midDate = new Date(startDate);
    midDate.setDate(midDate.getDate() + midPoint);

    const firstHalfSales = sales.filter(s => new Date(s.sale_date) < midDate);
    const secondHalfSales = sales.filter(s => new Date(s.sale_date) >= midDate);

    const firstHalfRevenue = firstHalfSales.reduce((sum, s) =>
      sum + (parseFloat(s.selling_price) * parseFloat(s.quantity)), 0
    );
    const secondHalfRevenue = secondHalfSales.reduce((sum, s) =>
      sum + (parseFloat(s.selling_price) * parseFloat(s.quantity)), 0
    );

    const growthRate = firstHalfRevenue > 0
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
      : 0;

    const salesByDate = {};

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      salesByDate[dateKey] = {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateKey: dateKey,
        revenue: 0,
        profit: 0,
        sales: 0
      };
    }

    sales.forEach(sale => {
      const dateKey = sale.sale_date;
      if (salesByDate[dateKey]) {
        const saleRevenue = parseFloat(sale.selling_price) * parseFloat(sale.quantity);
        const saleProfit = parseFloat(sale.profit);

        salesByDate[dateKey].revenue += saleRevenue;
        salesByDate[dateKey].profit += saleProfit;
        salesByDate[dateKey].sales += 1;
      }
    });

    const salesData = Object.values(salesByDate).sort((a, b) =>
      new Date(a.dateKey) - new Date(b.dateKey)
    );

    const productStats = {};
    sales.forEach(sale => {
      const variety = varietyMap[sale.variety_id];
      const name = variety ? variety.name : `Product ${sale.variety_id}`;

      if (!productStats[name]) {
        productStats[name] = {
          name,
          revenue: 0,
          profit: 0,
          quantity: 0,
          items_sold: 0,
          measurement_unit: variety?.measurement_unit || 'pieces',
          margin: 0
        };
      }

      const revenue = parseFloat(sale.selling_price) * parseFloat(sale.quantity);
      const profit = parseFloat(sale.profit);

      productStats[name].revenue += revenue;
      productStats[name].profit += profit;
      productStats[name].quantity += parseFloat(sale.quantity);
      productStats[name].items_sold += getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
    });

    Object.values(productStats).forEach(product => {
      product.margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const salespersonStats = {};
    sales.forEach(sale => {
      const variety = varietyMap[sale.variety_id];
      const name = sale.salesperson_name;

      if (!salespersonStats[name]) {
        salespersonStats[name] = {
          name,
          transactions: 0,
          revenue: 0,
          profit: 0,
          quantity: 0,
          items_sold: 0,
          avgTransactionValue: 0
        };
      }

      const revenue = parseFloat(sale.selling_price) * parseFloat(sale.quantity);
      const profit = parseFloat(sale.profit);

      salespersonStats[name].transactions += 1;
      salespersonStats[name].revenue += revenue;
      salespersonStats[name].profit += profit;
      salespersonStats[name].quantity += parseFloat(sale.quantity);
      salespersonStats[name].items_sold += getItemCount(sale.quantity, variety?.measurement_unit || 'pieces');
    });

    Object.values(salespersonStats).forEach(person => {
      person.avgTransactionValue = person.transactions > 0
        ? person.revenue / person.transactions
        : 0;
    });

    const salespersonPerformance = Object.values(salespersonStats)
      .sort((a, b) => b.revenue - a.revenue);

    const supplierStats = {};

    inventory.forEach(inv => {
      const name = inv.supplier_name;
      if (!supplierStats[name]) {
        supplierStats[name] = { name, totalSupply: 0, returns: 0, netAmount: 0, reliability: 0 };
      }
      supplierStats[name].totalSupply += parseFloat(inv.total_amount);
    });

    returns.forEach(ret => {
      const name = ret.supplier_name;
      if (!supplierStats[name]) {
        supplierStats[name] = { name, totalSupply: 0, returns: 0, netAmount: 0, reliability: 0 };
      }
      supplierStats[name].returns += parseFloat(ret.total_amount);
    });

    Object.values(supplierStats).forEach(supplier => {
      supplier.netAmount = supplier.totalSupply - supplier.returns;
      supplier.reliability = supplier.totalSupply > 0
        ? ((supplier.totalSupply - supplier.returns) / supplier.totalSupply) * 100
        : 100;
    });

    const suppliers = Object.values(supplierStats)
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 5);

    const totalRevenueByProduct = topProducts.reduce((sum, p) => sum + p.revenue, 0);
    const productMix = topProducts.map(product => ({
      name: product.name,
      value: totalRevenueByProduct > 0 ? (product.revenue / totalRevenueByProduct) * 100 : 0,
      amount: product.revenue
    }));

    const topProduct = topProducts.length > 0 ? topProducts[0] : null;
    const topProductShare = topProduct && totalRevenue > 0 ? (topProduct.revenue / totalRevenue) * 100 : 0;

    return {
      kpis: {
        totalRevenue: Math.round(totalRevenue),
        totalProfit: Math.round(totalProfit),
        totalSales,
        totalItemsSold,
        avgOrderValue: Math.round(avgOrderValue),
        growthRate: parseFloat(growthRate.toFixed(1)),
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        topProduct: topProduct ? topProduct.name : 'N/A',
        topProductShare: parseFloat(topProductShare.toFixed(1))
      },
      salesData,
      topProducts,
      suppliers,
      productMix,
      salespersonPerformance
    };
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    throw error;
  }
};

export const KPICard = ({ title, value, subtitle, icon: Icon, trend, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">{title}</p>
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 truncate">{value}</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
      </div>
      <div className={`p-2.5 sm:p-3 rounded-lg ${color} shrink-0 ml-2`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    </div>
    {trend !== null && trend !== undefined && (
      <div className="mt-3 sm:mt-4 flex items-center">
        {trend > 0 ? (
          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 mr-1" />
        ) : trend < 0 ? (
          <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 dark:text-red-400 mr-1" />
        ) : null}
        <span className={`text-xs sm:text-sm font-medium ${trend > 0 ? 'text-green-600 dark:text-green-400' : trend < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {trend === 0 ? '0.0%' : `${Math.abs(trend).toFixed(1)}%`}
        </span>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-1">vs previous period</span>
      </div>
    )}
  </div>
);