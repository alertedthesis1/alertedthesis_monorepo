import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Users,
  ShieldCheck,
  HeartHandshake,
  Database,
  Activity,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Key,
  Power,
  ClipboardList,
  User as UserIcon,
  FileText,
  Clock,
  X,
  Archive,
  RefreshCw,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { Role, useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { fetchUsers, createUser, updateUser, deleteUser, archiveUser, restoreUser, resetUserPassword, User } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  department?: string;
  isActive: boolean;
}

interface ActivityLog {
  _id: string;
  action: string;
  user: string;
  user_email: string;
  user_role: string;
  target_type?: string;
  target_id?: string;
  details?: any;
  last_login?: string;
  timestamp: string;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  counselor: 'bg-green-100 text-green-700',
  faculty: 'bg-blue-100 text-blue-700',
};

const ROLE_ICON: Record<Role, any> = {
  admin: ShieldCheck,
  counselor: HeartHandshake,
  faculty: Users,
};

export default function Admin() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | Role>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'email' | 'role'>('name');
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    role: 'counselor' as Role,
    password: '',
    department: '',
    section: '',
  });
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'counselor' as Role,
    department: '',
    section: '',
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      const managedUsers: ManagedUser[] = usersData.map((u: User) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role as Role,
        status: u.isActive ? 'Active' : 'Inactive',
        lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never',
        department: u.department,
        isActive: u.isActive,
      }));
      setUsers(managedUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/activity-logs`);
      setActivityLogs(data.data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const logActivity = async (action: string, targetType?: string, targetId?: string, details?: any) => {
    try {
      await axios.post(`${API_URL}/activity-logs`, {
        action,
        user: user?.name,
        user_email: user?.email,
        user_role: user?.role,
        target_type: targetType,
        target_id: targetId,
        details,
        last_login: new Date(),
      });
      fetchActivityLogs();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const matchesSearch =
      searchType === 'name'
        ? u.name.toLowerCase().includes(searchQuery.toLowerCase())
        : searchType === 'email'
        ? u.email.toLowerCase().includes(searchQuery.toLowerCase())
        : u.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      await createUser({
        name: addUserForm.name,
        email: addUserForm.email,
        password: addUserForm.password,
        role: addUserForm.role,
        department: addUserForm.department || (addUserForm.role === 'faculty' ? 'Junior High School' : 'Student Affairs'),
        section: addUserForm.role === 'faculty' ? addUserForm.section : undefined,
        isActive: true,
      });
      await logActivity('Added User', 'User', addUserForm.email, { role: addUserForm.role });
      alert('User created successfully!');
      setShowAddUserModal(false);
      setAddUserForm({
        name: '',
        email: '',
        role: 'counselor',
        password: '',
        department: '',
        section: '',
      });
      loadUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setEditingUser(true);
    try {
      await updateUser(selectedUser._id, {
        name: editUserForm.name,
        email: editUserForm.email,
        role: editUserForm.role,
        department: editUserForm.department,
        section: editUserForm.role === 'faculty' ? editUserForm.section : undefined,
      });
      await logActivity('Updated User', 'User', editUserForm.email, { role: editUserForm.role });
      alert('User updated successfully!');
      setShowEditUserModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update user');
    } finally {
      setEditingUser(false);
    }
  };

  const handleArchiveUser = async (user: ManagedUser) => {
    if (!confirm(`Are you sure you want to archive ${user.name}? This will deactivate their account.`)) return;
    
    try {
      if (user.isActive) {
        await archiveUser(user._id);
        await logActivity('Archived User', 'User', user.email, { role: user.role });
        alert('User archived successfully');
      } else {
        await restoreUser(user._id);
        await logActivity('Restored User', 'User', user.email, { role: user.role });
        alert('User restored successfully');
      }
      loadUsers();
      setShowActions(null);
    } catch (err) {
      console.error(err);
      alert('Failed to archive/restore user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (resetPasswordForm.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    setResettingPassword(true);
    try {
      await resetUserPassword(selectedUser._id, resetPasswordForm.password);
      await logActivity('Reset Password', 'User', selectedUser.email, { role: selectedUser.role });
      alert('Password reset successfully!');
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setResetPasswordForm({ password: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const openEditModal = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      section: '',
    });
    setShowEditUserModal(true);
    setShowActions(null);
  };

  const openResetPasswordModal = (user: ManagedUser) => {
    setSelectedUser(user);
    setResetPasswordForm({ password: '', confirmPassword: '' });
    setShowResetPasswordModal(true);
    setShowActions(null);
  };

  return (
    <>
      <Head>
        <title>Admin - AlertED</title>
      </Head>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-500">Manage users, roles, and system configuration</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={users.length} caption="Across all roles" icon={Users} iconColor="text-green-600" valueColor="text-green-600" />
          <StatCard label="Counselors" value={users.filter((u) => u.role === 'counselor').length} caption="Student affairs" icon={HeartHandshake} iconColor="text-green-600" valueColor="text-green-600" />
          <StatCard label="Faculty" value={users.filter((u) => u.role === 'faculty').length} caption="Teaching staff" icon={UserIcon} iconColor="text-blue-600" valueColor="text-blue-600" />
          <StatCard label="Admins" value={users.filter((u) => u.role === 'admin').length} caption="System administrators" icon={ShieldCheck} iconColor="text-purple-500" valueColor="text-purple-600" />
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-green-700" />
              <h2 className="text-lg font-bold text-gray-900">User Management</h2>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              <Plus size={16} /> Add User
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'name' | 'email' | 'role')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="name">Search by Name</option>
                <option value="email">Search by Email</option>
                <option value="role">Search by Role</option>
              </select>
              <input
                type="text"
                placeholder={`Search by ${searchType}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Search size={16} className="text-gray-400" />
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            {(['all', 'admin', 'counselor', 'faculty'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                  filter === f ? 'bg-green-700 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="px-3 py-2 font-semibold">User</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Last Login</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const Icon = ROLE_ICON[u.role];
                  return (
                    <tr key={u.email} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                            {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[u.role]}`}>
                          <Icon size={12} /> {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`h-2 w-2 rounded-full ${u.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{u.lastLogin}</td>
                      <td className="px-3 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setShowActions(showActions === u.email ? null : u.email)}
                            className="rounded-lg p-1.5 hover:bg-gray-100"
                          >
                            <MoreVertical size={16} className="text-gray-500" />
                          </button>
                          {showActions === u.email && (
                            <div className="absolute right-0 top-full z-10 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                              <button 
                                onClick={() => openEditModal(u)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit size={14} /> Edit User
                              </button>
                              <button 
                                onClick={() => openResetPasswordModal(u)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Key size={14} /> Reset Password
                              </button>
                              <button 
                                onClick={() => handleArchiveUser(u)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Archive size={14} /> {u.status === 'Active' ? 'Archive' : 'Restore'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={18} className="text-green-700" />
            <h2 className="text-lg font-bold text-gray-900">Activity Logs</h2>
          </div>
          <div className="space-y-3">
            {activityLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No activity logs yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log._id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500">by {log.user} ({log.user_role})</p>
                      {log.last_login && (
                        <p className="text-xs text-gray-400">Last login: {new Date(log.last_login).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
                <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Full Name</label>
                  <input
                    required
                    value={addUserForm.name}
                    onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                  <input
                    required
                    type="email"
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    placeholder="user@sjc.edu.ph"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
                  <select
                    required
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as Role })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="counselor">Counselor</option>
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
                {addUserForm.role === 'faculty' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Section</label>
                    <input
                      required
                      value={addUserForm.section}
                      onChange={(e) => setAddUserForm({ ...addUserForm, section: e.target.value })}
                      placeholder="e.g., Einstein"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Password</label>
                  <input
                    required
                    type="password"
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {addingUser ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditUserModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
                <button onClick={() => setShowEditUserModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Full Name</label>
                  <input
                    required
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                  <input
                    required
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    placeholder="user@sjc.edu.ph"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
                  <select
                    required
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as Role })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="counselor">Counselor</option>
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
                {editUserForm.role === 'faculty' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Section</label>
                    <input
                      required
                      value={editUserForm.section}
                      onChange={(e) => setEditUserForm({ ...editUserForm, section: e.target.value })}
                      placeholder="e.g., Einstein"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Department</label>
                  <input
                    value={editUserForm.department}
                    onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                    placeholder="e.g., Student Affairs"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editingUser}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {editingUser ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showResetPasswordModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
                <button onClick={() => setShowResetPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">User</label>
                  <p className="text-sm font-medium text-gray-900">{selectedUser.name} ({selectedUser.email})</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">New Password</label>
                  <input
                    required
                    type="password"
                    value={resetPasswordForm.password}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, password: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Confirm Password</label>
                  <input
                    required
                    type="password"
                    value={resetPasswordForm.confirmPassword}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {resettingPassword ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
