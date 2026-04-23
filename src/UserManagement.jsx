import React, { useState, useEffect } from 'react';
import * as api from './api';

const C = {
  navy: '#06262d',
  gold: '#b97231',
  goldHover: '#9d601c',
  white: '#fff',
  g100: '#f2f4f6',
  g200: '#e3e7eb',
  g300: '#cdd1d8',
  g700: '#374151',
};

export default function UserManagement({ userData }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    tier: 'registered',
    company: '',
    phone: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await api.users.list();
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    try {
      setLoading(true);
      const newUser = await api.users.create(formData);
      setUsers([newUser, ...users]);
      setFormData({
        name: '',
        email: '',
        password: '',
        tier: 'registered',
        company: '',
        phone: '',
      });
      setSuccess(
        newUser.temporaryPassword
          ? `User created with temporary password: ${newUser.temporaryPassword}`
          : 'User created successfully'
      );
      setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.users.remove(id);
      setUsers(users.filter(u => u.id !== id));
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: C.navy, marginBottom: '20px' }}>User Management</h2>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#dcfce7',
          color: '#166534',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          {success}
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          padding: '10px 20px',
          backgroundColor: C.gold,
          color: C.white,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '20px',
        }}
      >
        {showForm ? 'Cancel' : '+ Add New User'}
      </button>

      {showForm && (
        <form
          onSubmit={handleAddUser}
          style={{
            backgroundColor: C.g100,
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: `1px solid ${C.g300}`,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              style={{
                padding: '10px',
                border: `1px solid ${C.g300}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={{
                padding: '10px',
                border: `1px solid ${C.g300}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Password (leave blank for auto-generated)"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              style={{
                padding: '10px',
                border: `1px solid ${C.g300}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <select
              value={formData.tier}
              onChange={e => setFormData({ ...formData, tier: e.target.value })}
              style={{
                padding: '10px',
                border: `1px solid ${C.g300}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="registered">Registered User</option>
              <option value="premium">Premium User</option>
              <option value="analyst">Analyst</option>
              <option value="intern">Intern</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Company (optional)"
              value={formData.company}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
              style={{
                padding: '10px',
                border: `1px solid ${C.g300}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              style={{
                padding: '10px',
                border: `1px solid ${C.g300}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: C.navy,
              color: C.white,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      <div style={{
        overflowX: 'auto',
        backgroundColor: C.white,
        borderRadius: '8px',
        border: `1px solid ${C.g300}`,
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
        }}>
          <thead style={{ backgroundColor: C.g100 }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: C.navy, fontWeight: '600', borderBottom: `1px solid ${C.g300}` }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', color: C.navy, fontWeight: '600', borderBottom: `1px solid ${C.g300}` }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', color: C.navy, fontWeight: '600', borderBottom: `1px solid ${C.g300}` }}>Tier</th>
              <th style={{ padding: '12px', textAlign: 'left', color: C.navy, fontWeight: '600', borderBottom: `1px solid ${C.g300}` }}>Company</th>
              <th style={{ padding: '12px', textAlign: 'left', color: C.navy, fontWeight: '600', borderBottom: `1px solid ${C.g300}` }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.navy, fontWeight: '600', borderBottom: `1px solid ${C.g300}` }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.g300}`, backgroundColor: i % 2 === 0 ? C.white : C.g100 }}>
                <td style={{ padding: '12px' }}>{u.name}</td>
                <td style={{ padding: '12px' }}>{u.email}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: u.tier === 'admin' ? '#fee2e2' : u.tier === 'premium' ? '#fef3c7' : '#dcfce7',
                    color: u.tier === 'admin' ? '#991b1b' : u.tier === 'premium' ? '#92400e' : '#166534',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    {u.tier}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{u.company || '—'}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                    color: u.status === 'active' ? '#166534' : '#991b1b',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    {u.status}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => deleteUser(u.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc2626',
                      color: C.white,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: C.g700,
        }}>
          No users yet. Create one to get started!
        </div>
      )}
    </div>
  );
}
