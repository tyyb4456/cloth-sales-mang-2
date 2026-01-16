// frontend/src/pages/Varieties.jsx - UPDATED with price field

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, Package } from 'lucide-react';
import { getVarieties, createVariety, deleteVariety, updateVariety } from '../api/api';

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
    default_cost_price: '', // ✨ NEW
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
      const res = await getVarieties();
      setVarieties(Array.isArray(res.data) ? res.data : []);
    } catch {
      alert('Failed to load varieties');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        : null, // ✨ NEW
    };

    try {
      if (editingId) {
        await updateVariety(editingId, payload);
        alert('Variety updated successfully!');
      } else {
        await createVariety(payload);
        alert('Variety created successfully!');
      }
      resetForm();
      loadVarieties();
    } catch (err) {
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
      default_cost_price: variety.default_cost_price || '', // ✨ NEW
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this variety?')) return;
    try {
      await deleteVariety(id);
      loadVarieties();
      alert('Variety deleted successfully!');
    } catch {
      alert('Failed to delete variety');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      measurement_unit: 'pieces',
      standard_length: '',
      default_cost_price: '', // ✨ NEW
    });
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Cloth Varieties</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-5 py-2.5 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-800 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Plus size={18} className="mr-2" />
          Add Variety
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              {editingId ? 'Edit Variety' : 'New Variety'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variety Name *
              </label>
              <input
                placeholder="e.g., Cotton Fabric"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Measurement Unit *
              </label>
              <select
                value={formData.measurement_unit}
                onChange={(e) =>
                  setFormData({ ...formData, measurement_unit: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition"
                />
              </div>
            )}

            {/* ✨ NEW: Default Cost Price Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: This price will be auto-filled when recording sales
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSubmit}
                className="flex items-center px-6 py-3 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-800 transition hover:shadow-lg"
              >
                <Save size={18} className="mr-2" />
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading varieties...</p>
          </div>
        ) : varieties.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-600 font-medium mb-1">No varieties found</p>
            <p className="text-sm text-gray-400">Add your first cloth variety to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Standard Length
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Default Cost
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {varieties.map((v, idx) => (
                  <tr key={v.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{v.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {v.measurement_unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {v.standard_length 
                        ? `${v.standard_length} ${v.measurement_unit}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {v.default_cost_price ? (
                        <span className="font-medium text-green-700">
                          ₹{parseFloat(v.default_cost_price).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">
                      {v.description || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
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
        )}
      </div>

      {varieties.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Total: {varieties.length} {varieties.length === 1 ? 'variety' : 'varieties'}
        </div>
      )}
    </div>
  );
}
