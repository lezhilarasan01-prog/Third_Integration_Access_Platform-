import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Mail,
  Phone,
  Building,
  Key,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Database,
  X
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';

const ROLES = [
  {
    id: 'SYSTEM_ADMIN',
    label: 'System Admin',
    desc: 'Full read/write permissions, user management, Kafka topic configuration, and system settings.',
    badgeClass: 'badge-purple'
  },
  {
    id: 'INTEGRATION_OPERATOR',
    label: 'Integration Operator',
    desc: 'Ingest ERP files, monitor pipelines, inspect S3, and replay DLQ messages.',
    badgeClass: 'badge-blue'
  },
  {
    id: 'COMPLIANCE_AUDITOR',
    label: 'Compliance Auditor',
    desc: 'Read-only access to audit logs, transaction tracking, and processing history.',
    badgeClass: 'badge-orange'
  }
];

export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: '' }

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'INTEGRATION_OPERATOR',
    department: '',
    password: '',
    active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch users from PostgreSQL DB
  const loadUsers = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const data = await integrationApi.getUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load users from database.' });
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchQuery ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.active) ||
        (statusFilter === 'DISABLED' && !u.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const disabled = total - active;
    const admins = users.filter((u) => u.role === 'SYSTEM_ADMIN').length;
    return { total, active, disabled, admins };
  }, [users]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      role: 'INTEGRATION_OPERATOR',
      department: 'Logistics Operations',
      password: '',
      active: true
    });
    setFormError('');
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role || 'INTEGRATION_OPERATOR',
      department: user.department || '',
      password: '', // Blank unless changing
      active: user.active
    });
    setFormError('');
    setShowPassword(false);
  };

  // Submit Add User
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.username.trim() || formData.username.trim().length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }
    if (!formData.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await integrationApi.createUser(formData);
      setFeedback({
        type: 'success',
        text: res.message || `User '${formData.username}' created successfully in database.`
      });
      setIsAddModalOpen(false);
      await loadUsers(false);
    } catch (err) {
      setFormError(err.message || 'Error creating user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit User
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError('');

    if (!formData.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        department: formData.department,
        active: formData.active
      };
      if (formData.password && formData.password.trim().length >= 6) {
        payload.password = formData.password.trim();
      }

      const res = await integrationApi.updateUser(editingUser.id, payload);
      setFeedback({
        type: 'success',
        text: res.message || `User '${editingUser.username}' updated successfully.`
      });
      setEditingUser(null);
      await loadUsers(false);
    } catch (err) {
      setFormError(err.message || 'Failed to update user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      const res = await integrationApi.deleteUser(deletingUser.id);
      setFeedback({
        type: 'success',
        text: res.message || `User '${deletingUser.username}' deleted from database.`
      });
      setDeletingUser(null);
      await loadUsers(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to delete user account.'
      });
      setDeletingUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle User Active Status
  const handleToggleStatus = async (user) => {
    if (user.username === 'admin') {
      setFeedback({
        type: 'error',
        text: 'The primary system administrator account cannot be deactivated.'
      });
      return;
    }

    try {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
      );
      const res = await integrationApi.toggleUserStatus(user.id);
      setFeedback({
        type: 'success',
        text: res.message || `Status updated for '${user.username}'.`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to toggle account status.'
      });
      await loadUsers(false);
    }
  };

  return (
    <div className="settings-page-view">
      {/* 1. Header Banner */}
      <div className="settings-header-card">
        <div className="settings-title-group">
          <div className="settings-badge-icon">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="badge-row">
              <span className="live-status-pill online">
                <span className="pulsing-dot" /> LIVE
              </span>
              <span className="security-pill">ROLE-BASED ACCESS CONTROL</span>
            </div>
            <h2>User Management &amp; Access Control</h2>
          </div>
        </div>

        <div className="settings-header-actions">
          <button
            className="refresh-studio-btn"
            onClick={() => loadUsers(true)}
            disabled={isLoading}
            title="Reload users from database"
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            <span>Sync DB</span>
          </button>
          <button className="primary-action-btn" onClick={handleOpenAddModal}>
            <UserPlus size={16} />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* 2. Alerts Banner */}
      {feedback && (
        <div className={`studio-alert-banner ${feedback.type}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
          <button
            type="button"
            className="alert-dismiss-btn"
            onClick={() => setFeedback(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. Metric Stats Row */}
      <div className="settings-stats-grid">
        <div className="settings-stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Total Database Users</span>
            <Database size={18} className="stat-icon-blue" />
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-caption">Registered accounts</div>
        </div>

        <div className="settings-stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Active Accounts</span>
            <UserCheck size={18} className="stat-icon-green" />
          </div>
          <div className="stat-value text-green">{stats.active}</div>
          <div className="stat-caption">Authorized for platform sign-in</div>
        </div>

        <div className="settings-stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Disabled / Suspended</span>
            <UserX size={18} className="stat-icon-amber" />
          </div>
          <div className="stat-value text-amber">{stats.disabled}</div>
          <div className="stat-caption">Login blocked by administrator</div>
        </div>

        <div className="settings-stat-card">
          <div className="stat-card-header">
            <span className="stat-title">System Administrators</span>
            <Shield size={18} className="stat-icon-purple" />
          </div>
          <div className="stat-value text-purple">{stats.admins}</div>
          <div className="stat-caption">Full administrative privileges</div>
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="settings-toolbar-card">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="settings-search-input"
            placeholder="Search by username, full name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="filter-item">
            <label>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="settings-select"
            >
              <option value="ALL">All Roles</option>
              <option value="SYSTEM_ADMIN">System Admin</option>
              <option value="INTEGRATION_OPERATOR">Integration Operator</option>
              <option value="COMPLIANCE_AUDITOR">Compliance Auditor</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="settings-select"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Disabled Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. User Accounts Table */}
      <div className="settings-table-card">
        <div className="table-header-title">
          <div className="table-title-wrap">
            <h3>Enterprise Accounts</h3>
            <span className="table-count-pill">{filteredUsers.length} records</span>
          </div>
          <span className="db-sync-tag">100% PostgreSQL Source</span>
        </div>

        {isLoading ? (
          <div className="settings-loading-box">
            <RefreshCw size={24} className="spinning" />
            <p>Loading user accounts from database...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="settings-empty-box">
            <Database size={36} />
            <h4>No User Accounts Found</h4>
            <p>
              {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No users match your filter criteria. Try adjusting the search query.'
                : 'No users registered in the database yet. Click "+ Add New User" to create one.'}
            </p>
          </div>
        ) : (
          <div className="settings-table-scroll">
            <table className="settings-users-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Contact Info</th>
                  <th>Department</th>
                  <th>Role &amp; Permissions</th>
                  <th>Status</th>
                  <th>Last Login / Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const roleObj = ROLES.find((r) => r.id === user.role) || {
                    label: user.role,
                    badgeClass: 'badge-blue'
                  };
                  const initials = (user.fullName || user.username || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={user.id} className={!user.active ? 'row-disabled' : ''}>
                      <td>
                        <div className="user-profile-cell">
                          <div className={`user-avatar-circle ${user.active ? 'active-avatar' : 'disabled-avatar'}`}>
                            {initials}
                          </div>
                          <div className="user-profile-info">
                            <span className="user-name-text">{user.fullName || user.username}</span>
                            <span className="user-username-badge">@{user.username}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="contact-cell">
                          {user.email ? (
                            <span className="contact-item" title={user.email}>
                              <Mail size={13} /> {user.email}
                            </span>
                          ) : (
                            <span className="contact-empty">—</span>
                          )}
                          {user.phoneNumber ? (
                            <span className="contact-item" title={user.phoneNumber}>
                              <Phone size={13} /> {user.phoneNumber}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <span className="department-badge">
                          <Building size={12} /> {user.department || 'Operations'}
                        </span>
                      </td>

                      <td>
                        <span className={`role-badge ${roleObj.badgeClass}`} title={roleObj.desc}>
                          <Shield size={12} /> {roleObj.label}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`status-toggle-btn ${user.active ? 'is-active' : 'is-disabled'}`}
                          onClick={() => handleToggleStatus(user)}
                          title={`Click to ${user.active ? 'deactivate' : 'activate'} this user`}
                        >
                          <span className="toggle-indicator" />
                          <span className="toggle-label">{user.active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      <td>
                        <div className="timestamp-cell">
                          <span className="last-login-text">
                            {user.lastLoginAt
                              ? `Login: ${new Date(user.lastLoginAt).toLocaleDateString()} ${new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Never logged in'}
                          </span>
                          <span className="created-text">
                            {user.createdAt ? `Created ${new Date(user.createdAt).toLocaleDateString()}` : ''}
                          </span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-group">
                          <button
                            type="button"
                            className="user-action-btn edit-btn"
                            onClick={() => handleOpenEditModal(user)}
                            title="Edit user details"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="user-action-btn delete-btn"
                            onClick={() => setDeletingUser(user)}
                            disabled={user.username === 'admin'}
                            title={user.username === 'admin' ? 'Root admin cannot be deleted' : 'Delete user'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Modal: Add New User */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-header">
              <div className="modal-header-title">
                <UserPlus size={20} className="modal-icon text-green" />
                <h3>Add New Enterprise User</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd}>
              <div className="modal-body">
                {formError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-row two-cols">
                  <div className="form-field">
                    <label>Username <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. jsmith"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                    <span className="field-hint">Unique platform login identifier</span>
                  </div>

                  <div className="form-field">
                    <label>Full Name <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Smith"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row two-cols">
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="jsmith@ncspartners.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row two-cols">
                  <div className="form-field">
                    <label>Role &amp; Permissions <span className="req">*</span></label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="SYSTEM_ADMIN">System Admin (Full Control)</option>
                      <option value="INTEGRATION_OPERATOR">Integration Operator (Pipelines &amp; Files)</option>
                      <option value="COMPLIANCE_AUDITOR">Compliance Auditor (Read-only Audit)</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Logistics &amp; ERP"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Initial Password <span className="req">*</span></label>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="pwd-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-checkbox-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    <span>Account is active &amp; authorized to sign in immediately</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-secondary-btn"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-primary-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="spinning" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Edit User */}
      {editingUser && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-header">
              <div className="modal-header-title">
                <Edit2 size={20} className="modal-icon text-blue" />
                <h3>Edit User Account</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setEditingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body">
                {formError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-row two-cols">
                  <div className="form-field">
                    <label>Username</label>
                    <input
                      type="text"
                      disabled
                      value={editingUser.username}
                      className="input-disabled"
                    />
                    <span className="field-hint">Primary username identifier is locked.</span>
                  </div>

                  <div className="form-field">
                    <label>Full Name <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row two-cols">
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row two-cols">
                  <div className="form-field">
                    <label>Role &amp; Permissions <span className="req">*</span></label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="SYSTEM_ADMIN">System Admin (Full Control)</option>
                      <option value="INTEGRATION_OPERATOR">Integration Operator (Pipelines &amp; Files)</option>
                      <option value="COMPLIANCE_AUDITOR">Compliance Auditor (Read-only Audit)</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Reset Password (Optional)</label>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Leave blank to keep existing password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="pwd-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="field-hint">Only enter if you wish to reset this user's password.</span>
                </div>

                <div className="form-checkbox-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      disabled={editingUser.username === 'admin'}
                    />
                    <span>Account is active &amp; authorized to sign in</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-secondary-btn"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-primary-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="spinning" />
                      <span>Updating DB...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Delete User Confirmation */}
      {deletingUser && (
        <div className="modal-backdrop">
          <div className="modal-window delete-modal-window">
            <div className="modal-header">
              <div className="modal-header-title">
                <Trash2 size={20} className="modal-icon text-red" />
                <h3>Delete User Account</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setDeletingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="delete-warning-text">
                Are you sure you want to permanently delete the account for{' '}
                <strong>{deletingUser.fullName || deletingUser.username}</strong> (<code>@{deletingUser.username}</code>)?
              </p>
              <div className="delete-info-card">
                <div><strong>Role:</strong> {deletingUser.role}</div>
                <div><strong>Email:</strong> {deletingUser.email || '—'}</div>
                <div><strong>Department:</strong> {deletingUser.department || '—'}</div>
              </div>
              <p className="delete-subwarning">
                This will purge the user from PostgreSQL table <code>erp_users</code>. This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={() => setDeletingUser(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-danger-btn"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="spinning" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
