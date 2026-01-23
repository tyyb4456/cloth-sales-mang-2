// frontend/src/pages/Varieties.jsx - WITH MODERN SKELETON LOADING UI
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, Package } from 'lucide-react';
import api from '../api/api';

// SKELETON SHIMMER COMPONENT
const SkeletonShimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
  </div>
);

// MOBILE CARD SKELETON
function SkeletonMobileCard() {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonShimmer className="h-5 w-32 sm:w-40" />
          <SkeletonShimmer className="h-4 w-20 sm:w-24" />
        </div>
        <div className="flex items-center gap-1 ml-2">
          <SkeletonShimmer className="w-8 h-8 rounded-lg" />
          <SkeletonShimmer className="w-8 h-8 rounded-lg" />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <SkeletonShimmer className="h-4 w-28" />
          <SkeletonShimmer className="h-4 w-24" />
        </div>
        <div className="flex justify-between">
          <SkeletonShimmer className="h-4 w-24" />
          <SkeletonShimmer className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

// DESKTOP TABLE SKELETON
function SkeletonTableRow() {
  return (
    <tr className="border-t border-gray-200 dark:border-gray-700">
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-5 w-32 sm:w-40" />
      </td>
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-6 w-20 sm:w-24 rounded-full" />
      </td>
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-4 w-24 sm:w-28" />
      </td>
      <td className="px-6 py-4 text-right">
        <SkeletonShimmer className="h-5 w-20 sm:w-24 ml-auto" />
      </td>
      <td className="px-6 py-4">
        <SkeletonShimmer className="h-4 w-32 sm:w-40" />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <SkeletonShimmer className="w-9 h-9 rounded-lg" />
          <SkeletonShimmer className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export default function Varieties() {
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    measurement_unit: 'pieces',
    standard_length: '',
    default_cost_price: '',
  });

  const units = [
    { value: 'pieces', label: 'Pieces' },
    { value: 'meters', label: 'Meters' },
    { value: 'yards', label: 'Yards' },
  ];

  useEffect(() => {
    loadVarieties();
  }, []);

  const loadVarieties = async () => {
    setLoading(true);
    try {
      const res = await api.get('/varieties/');
      setVarieties(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load varieties:', error);
      alert('Failed to load varieties');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const payload = {
      name: formData.name,
      description: formData.description || null,
      measurement_unit: formData.measurement_unit,
      standard_length:
        formData.measurement_unit === 'pieces'
          ? null
          : Number(formData.standard_length),
      default_cost_price: formData.default_cost_price 
        ? Number(formData.default_cost_price) 
        : null,
    };

    try {
      if (editingId) {
        await api.put(`/varieties/${editingId}`, payload);
        alert('Variety updated successfully!');
      } else {
        await api.post('/varieties/', payload);
        alert('Variety created successfully!');
      }
      resetForm();
      loadVarieties();
    } catch (err) {
      console.error('Failed to save variety:', err);
      alert(err.response?.data?.detail || 'Failed to save variety');
    }
  };

  const handleEdit = (variety) => {
    setEditingId(variety.id);
    setFormData({
      name: variety.name,
      description: variety.description || '',
      measurement_unit: variety.measurement_unit,
      standard_length: variety.standard_length || '',
      default_cost_price: variety.default_cost_price || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this variety?')) return;
    try {
      await api.delete(`/varieties/${id}`);
      loadVarieties();
      alert('Variety deleted successfully!');
    } catch (error) {
      console.error('Failed to delete variety:', error);
      alert('Failed to delete variety');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      measurement_unit: 'pieces',
      standard_length: '',
      default_cost_price: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* 📱 HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-500">
            Cloth Varieties
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your product catalog
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto flex items-center justify-center px-4 sm:px-5 py-2.5 rounded-lg bg-gray-700 dark:bg-gray-600 text-white font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition-all text-sm sm:text-base"
        >
          <Plus size={18} className="mr-2" />
          Add Variety
        </button>
      </div>

      {/* 📱 FORM */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
              {editingId ? 'Edit Variety' : 'New Variety'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-1"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variety Name *
              </label>
              <input
                placeholder="e.g., Cotton Fabric"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Measurement Unit *
              </label>
              <select
                value={formData.measurement_unit}
                onChange={(e) =>
                  setFormData({ ...formData, measurement_unit: e.target.value })
                }
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
              >
                {units.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {(formData.measurement_unit === 'meters' ||
              formData.measurement_unit === 'yards') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Standard Length *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g., 2.5"
                  value={formData.standard_length}
                  onChange={(e) =>
                    setFormData({ ...formData, standard_length: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Cost Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 150.00"
                value={formData.default_cost_price}
                onChange={(e) =>
                  setFormData({ ...formData, default_cost_price: e.target.value })
                }
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optional: This price will be auto-filled when recording sales
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 dark:bg-gray-700 dark:text-gray-100 transition text-sm sm:text-base resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                onClick={handleSubmit}
                className="w-full sm:w-auto flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gray-700 dark:bg-gray-600 text-white font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition text-sm sm:text-base"
              >
                <Save size={18} className="mr-2" />
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 VARIETIES LIST */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <>
            <div className="block lg:hidden">
              {[...Array(5)].map((_, i) => (
                <SkeletonMobileCard key={i} />
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Standard Length</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Default Cost</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(5)].map((_, i) => (
                    <SkeletonTableRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : varieties.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="text-gray-400 dark:text-gray-500" size={32} />
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-1">No varieties found</p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Add your first cloth variety to get started</p>
          </div>
        ) : (
          <>
            <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {varieties.map((v) => (
                <div key={v.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1 truncate">
                        {v.name}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                        {v.measurement_unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(v)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    {v.standard_length && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Standard Length:</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">
                          {v.standard_length} {v.measurement_unit}
                        </span>
                      </div>
                    )}
                    {v.default_cost_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Default Cost:</span>
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          ₹{parseFloat(v.default_cost_price).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {v.description && (
                      <div className="pt-1">
                        <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                          {v.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Standard Length</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Default Cost</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {varieties.map((v, idx) => (
                    <tr key={v.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{v.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                          {v.measurement_unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {v.standard_length ? `${v.standard_length} ${v.measurement_unit}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {v.default_cost_price ? (
                          <span className="font-medium text-green-700 dark:text-green-400">
                            ₹{parseFloat(v.default_cost_price).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm max-w-xs truncate">
                        {v.description || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(v)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!loading && varieties.length > 0 && (
        <div className="mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
          Total: {varieties.length} {varieties.length === 1 ? 'variety' : 'varieties'}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}