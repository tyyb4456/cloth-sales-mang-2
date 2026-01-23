// frontend/src/pages/TeamManagement.jsx - MOBILE-FIRST RESPONSIVE VERSION

import { useState, useEffect } from 'react';
import { 
  Plus, Users, Trash2, Edit2, Mail, Phone, 
  Shield, ShieldCheck, UserX, UserCheck, Key,
  AlertCircle, Crown, X
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm sm:text-base text-gray-600">This page is only accessible to business owners.</p>
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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* MOBILE-FIRST HEADER */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Team Management</h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your business team members</p>
            </div>
            
            {teamStats?.can_add_users && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 transition shadow-lg active:scale-95"
              >
                <Plus size={18} />
                <span className="text-sm sm:text-base">Add Team Member</span>
              </button>
            )}
          </div>
        </div>

        {/* MOBILE-FIRST TEAM STATS */}
        {teamStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Total Users</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{teamStats.total_users}</p>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Active Users</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">{teamStats.active_users}</p>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Salespersons</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700">{teamStats.salespersons}</p>
            </div>

            <div className={`rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border col-span-2 lg:col-span-1 ${
              teamStats.remaining_slots > 0 
                ? 'bg-white border-gray-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className={`w-6 h-6 sm:w-8 sm:h-8 ${
                  teamStats.remaining_slots > 0 ? 'text-gray-600' : 'text-red-600'
                }`} />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Available Slots</p>
              <p className={`text-xl sm:text-2xl font-bold ${
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

        {/* MOBILE-FIRST ADD/EDIT FORM */}
        {showAddForm && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                {editingUser ? 'Edit Team Member' : 'Add New Team Member'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-100 rounded-lg transition lg:hidden"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="salesperson">Salesperson</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                {!editingUser && (
                  <>
                    <div>
                      <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        required
                        minLength={8}
                      />
                    </div>

                    <div>
                      <label className="block mb-1 sm:mb-2 text-sm font-medium text-gray-700">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-gray-700 transition active:scale-95"
                  >
                    {editingUser ? 'Update Member' : 'Add Member'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg text-sm sm:text-base hover:bg-gray-100 transition active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* MOBILE-FIRST TEAM MEMBERS LIST */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Team Members</h3>
          </div>

          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-gray-500">
              <Users size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">No team members yet</p>
            </div>
          ) : (
            <>
              {/* MOBILE: CARD LAYOUT */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {teamMembers.map((member) => (
                  <div key={member.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        member.role === 'owner' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        {member.role === 'owner' ? (
                          <Crown className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Shield className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {member.full_name}
                          {member.id === user.id && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{member.email}</div>
                        {member.phone && (
                          <div className="text-xs text-gray-500 mt-1">{member.phone}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {member.role}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        member.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {member.id !== user.id && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEdit(member)}
                          className="flex-1 min-w-25 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg text-sm hover:bg-blue-100 transition active:scale-95"
                        >
                          <Edit2 size={16} />
                          <span>Edit</span>
                        </button>

                        {member.is_active ? (
                          <button
                            onClick={() => handleDeactivate(member.id, member.full_name)}
                            className="flex-1 min-w-25 flex items-center justify-center gap-2 px-3 py-2 text-orange-600 bg-orange-50 rounded-lg text-sm hover:bg-orange-100 transition active:scale-95"
                          >
                            <UserX size={16} />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(member.id, member.full_name)}
                            className="flex-1 min-w-25 flex items-center justify-center gap-2 px-3 py-2 text-green-600 bg-green-50 rounded-lg text-sm hover:bg-green-100 transition active:scale-95"
                          >
                            <UserCheck size={16} />
                            <span>Reactivate</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(member.id, member.full_name)}
                          className="px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition active:scale-95"
                          aria-label="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* DESKTOP: TABLE LAYOUT */}
              <div className="hidden lg:block overflow-x-auto">
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
            </>
          )}
        </div>

      </div>
    </div>
  );
}