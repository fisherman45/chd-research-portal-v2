import React, { useState } from 'react';

const C = {
  navy: '#062E2D',
  gold: '#B97231',
  white: '#FFFFFF',
  offWhite: '#F9FAFB',
  g100: '#F3F4F6',
  g200: '#E5E7EB',
  g500: '#6B7280',
  red: '#DC2626',
  green: '#16A34A',
};

export default function ChangePasswordModal({ email, onPasswordChanged, isOpen }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
  });

  // Validate password requirements as user types
  const validatePassword = (pwd) => {
    setNewPassword(pwd);
    setPasswordChecks({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    });
  };

  const isPasswordValid = () => {
    return passwordChecks.length && passwordChecks.uppercase && passwordChecks.number;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!oldPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!isPasswordValid()) {
      setError('New password does not meet requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword === oldPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/change-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        onPasswordChanged();
      } else {
        setError(data.message || 'Failed to change password. Please try again.');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: C.white,
        borderRadius: 12,
        padding: 32,
        maxWidth: 420,
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ color: C.navy, marginBottom: 8, fontSize: '1.5rem' }}>
          Set Your Password
        </h2>
        <p style={{ color: C.g500, marginBottom: 24, fontSize: '0.9rem' }}>
          This is your first login. Please set a new password to secure your account.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: C.navy, fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>
              Current Password
            </label>
            <input
              type="password"
              placeholder="researchislife"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${C.g200}`,
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* New Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: C.navy, fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => validatePassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${C.g200}`,
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />

            {/* Password Requirements */}
            <div style={{ marginTop: 12, fontSize: '0.8rem' }}>
              <div style={{ color: passwordChecks.length ? C.green : C.g500, marginBottom: 4 }}>
                {passwordChecks.length ? '✓' : '○'} At least 8 characters
              </div>
              <div style={{ color: passwordChecks.uppercase ? C.green : C.g500, marginBottom: 4 }}>
                {passwordChecks.uppercase ? '✓' : '○'} At least 1 uppercase letter
              </div>
              <div style={{ color: passwordChecks.number ? C.green : C.g500 }}>
                {passwordChecks.number ? '✓' : '○'} At least 1 number
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: C.navy, fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${C.g200}`,
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#FEE2E2',
              color: C.red,
              padding: 12,
              borderRadius: 6,
              marginBottom: 16,
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isPasswordValid() || loading}
            style={{
              width: '100%',
              padding: 12,
              background: isPasswordValid() && !loading ? C.gold : C.g200,
              color: C.white,
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: isPasswordValid() && !loading ? 'pointer' : 'not-allowed',
              opacity: isPasswordValid() && !loading ? 1 : 0.6,
            }}
          >
            {loading ? 'Changing Password...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
