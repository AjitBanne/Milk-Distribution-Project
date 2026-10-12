import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Edit2,
  X,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { User, UserRole } from '../../types/dairy';
import { useAuth } from '../../context/AuthContext';
import { getUsersByEntity, saveUser } from '../../services/storage';

interface UserManagementViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { currentEntity, currentUser, isOwner } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>(
    currentEntity ? getUsersByEntity(currentEntity.id) : []
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
  }>({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'OPERATOR',
    isActive: true,
  });

  const refreshList = () => {
    if (currentEntity) {
      setUsers(getUsersByEntity(currentEntity.id));
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: 'password123',
      phone: '',
      role: 'OPERATOR',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      email: u.email,
      password: u.password,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      onErrorToast('Name and email are required.');
      return;
    }

    if (editingUser) {
      saveUser({
        ...editingUser,
        name: formData.name.trim(),
        username: formData.username.trim() || editingUser.username,
        email: formData.email.trim(),
        password: formData.password || editingUser.password,
        phone: formData.phone.trim(),
        role: formData.role,
        isActive: formData.isActive,
      });
      onSuccessToast(`User ${formData.name} updated!`);
      setEditingUser(null);
    } else {
      if (!currentEntity) return;
      const newUser: User = {
        id: `usr_${Date.now()}`,
        entityId: currentEntity.id,
        username: formData.username.trim() || formData.email.split('@')[0],
        email: formData.email.trim(),
        password: formData.password || 'password123',
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      saveUser(newUser);
      onSuccessToast(`User ${formData.name} created!`);
      setIsAddModalOpen(false);
    }
    refreshList();
  };

  const handleToggleActive = (u: User) => {
    if (u.id === currentUser?.id) {
      onErrorToast('Cannot deactivate your own active logged-in account.');
      return;
    }
    saveUser({ ...u, isActive: !u.isActive });
    onSuccessToast(`User ${u.name} is now ${!u.isActive ? 'Active' : 'Inactive'}.`);
    refreshList();
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                User Management &amp; Role Access Control
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintain Owner, Admin, and Route Operator credentials for {currentEntity?.name}
              </p>
            </div>
          </div>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entity User</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
            <tr>
              <th className="py-3 px-4">Full Name</th>
              <th className="py-3 px-4">Login Email / Username</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                <td className="py-3 px-4 text-slate-600">
                  <div>{u.email}</div>
                  <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      u.role === 'OWNER'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">{u.phone || '—'}</td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      u.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {isOwner && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="p-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={u.id === currentUser?.id}
                        onClick={() => handleToggleActive(u)}
                        className="px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200 disabled:opacity-30"
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingUser ? 'Edit User Profile' : 'Add New Application User'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@dairy.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="ramesh_op"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    System Role <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    <option value="OPERATOR">OPERATOR (Route &amp; Bills)</option>
                    <option value="ADMIN">ADMIN (Masters &amp; Reports)</option>
                    <option value="OWNER">OWNER (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    placeholder="password123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mobile Phone
                </label>
                <input
                  type="tel"
                  placeholder="9822012345"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingUser ? 'Save User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
