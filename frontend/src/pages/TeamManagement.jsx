import { useState, useEffect } from 'react';
import { 
  Plus, Users, Trash2, Edit2, Mail, Phone, 
  Shield, ShieldCheck, UserX, UserCheck, Key,
  AlertCircle, Crown
} from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../App';

export default function TeamManagement() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'salesperson'
  });

  // Check if user is owner
  if (user?.role !== 'owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to business owners.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const [membersRes, statsRes] = await Promise.all([
        api.get('/users/'),
        api.get('/users/stats/team-summary')
      ]);
      
      setTeamMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      setTeamStats(statsRes.data);
    } catch (error) {
      console.error('Error loading team data:', error);
      alert('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingUser) {
      if (formData.password !== formData.confirm_password) {
        alert('Passwords do not match');
        return;
      }

      if (formData.password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
      }
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role
        });
        alert('Team member updated successfully!');
      } else {
        await api.post('/users/', {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          password: formData.password,
          role: formData.role
        });
        alert('Team member added successfully!');
      }

      resetForm();
      loadTeamData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save team member');
    }
  };

  const handleDeactivate = async (userId, userName) => {
    if (!confirm(`Deactivate ${userName}? They won't be able to log in.`)) return;

    try {
      await api.post(`/users/${userId}/deactivate`);
      alert('User deactivated successfully');
      loadTeamData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to deactivate user');
    }
  };

  const handleReactivate = async (userId, userName) => {
    try {
      await api.post(`/users/${userId}/reactivate`);
      alert(`${userName} reactivated successfully`);
      loadTeamData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to reactivate user');
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`⚠️ PERMANENTLY DELETE ${userName}?\n\nThis action CANNOT be undone!`)) return;

    try {
      await api.delete(`/users/${userId}`);
      alert('User deleted successfully');
      loadTeamData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const startEdit = (member) => {
    setEditingUser(member);
    setFormData({
      full_name: member.full_name,
      email: member.email,
      phone: member.phone || '',
      password: '',
      confirm_password: '',
      role: member.role
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      role: 'salesperson'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Team Management</h2>
            <p className="text-gray-600 mt-1">Manage your business team members</p>
          </div>
          
          {teamStats?.can_add_users && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center px-5 py-2.5 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 transition"
            >
              <Plus size={18} className="mr-2" />
              Add Team Member
            </button>
          )}
        </div>

        {/* Team Stats */}
        {teamStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{teamStats.total_users}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-700">{teamStats.active_users}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">Salespersons</p>
              <p className="text-2xl font-bold text-purple-700">{teamStats.salespersons}</p>
            </div>

            <div className={`rounded-xl shadow-sm p-6 border ${
              teamStats.remaining_slots > 0 
                ? 'bg-white border-gray-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className={`w-8 h-8 ${
                  teamStats.remaining_slots > 0 ? 'text-gray-600' : 'text-red-600'
                }`} />
              </div>
              <p className="text-sm text-gray-600">Available Slots</p>
              <p className={`text-2xl font-bold ${
                teamStats.remaining_slots > 0 ? 'text-gray-900' : 'text-red-700'
              }`}>
                {teamStats.remaining_slots} / {teamStats.max_users}
              </p>
              {teamStats.remaining_slots === 0 && (
                <p className="text-xs text-red-600 mt-1">Upgrade to add more</p>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              {editingUser ? 'Edit Team Member' : 'Add New Team Member'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="salesperson">Salesperson</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      required
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 flex gap-3">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                >
                  {editingUser ? 'Update Member' : 'Add Member'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Members List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">Team Members</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No team members yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Contact</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            member.role === 'owner' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            {member.role === 'owner' ? (
                              <Crown className="w-5 h-5 text-purple-600" />
                            ) : (
                              <Shield className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.full_name}
                              {member.id === user.id && (
                                <span className="ml-2 text-xs text-gray-500">(You)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {member.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {member.phone || '—'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          member.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {member.id !== user.id && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startEdit(member)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>

                            {member.is_active ? (
                              <button
                                onClick={() => handleDeactivate(member.id, member.full_name)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                title="Deactivate"
                              >
                                <UserX size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(member.id, member.full_name)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Reactivate"
                              >
                                <UserCheck size={18} />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(member.id, member.full_name)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}