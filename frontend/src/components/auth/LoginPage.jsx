import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Radio,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Check
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';

export default function LoginPage({ onLoginSuccess }) {
  // Standard Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password / DB Verification State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Verify Email/Identifier in DB, 2: Reset Password, 3: Success
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedUserInfo, setVerifiedUserInfo] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await integrationApi.login(username, password);
      localStorage.removeItem('erp_user_token');
      localStorage.removeItem('erp_user_profile');
      if (response.token) {
        sessionStorage.setItem('erp_user_token', response.token);
      }
      onLoginSuccess(response.user);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Step 1: Verify Email / Username against erp_users Database Table ---
  const handleVerifyIdentity = async (e) => {
    e?.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered email address, username, or phone number.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      // Calls /api/v1/auth/forgot-password/verify-identity to verify in PostgreSQL
      const res = await integrationApi.verifyIdentity(forgotIdentifier.trim());
      setVerifiedUserInfo(res);
      setForgotStep(2); // Identity confirmed in DB -> Approved to change password!
    } catch (err) {
      setForgotError(err.message || 'No account matches this email or username in the database.');
    } finally {
      setForgotLoading(false);
    }
  };

  // --- Step 2: Set New Password directly once approved ---
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setForgotError('');

    if (!newPassword || newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('New password and confirmation password do not match.');
      return;
    }

    setForgotLoading(true);

    try {
      await integrationApi.resetPassword(
        verifiedUserInfo?.username || forgotIdentifier,
        verifiedUserInfo?.resetToken || 'APPROVED-DIRECT',
        newPassword
      );

      // Move to Success Confirmation view
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.message || 'Failed to update password in database.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    if (verifiedUserInfo?.username) {
      setUsername(verifiedUserInfo.username);
    }
    if (newPassword) {
      setPassword(newPassword);
    }
    setIsForgotMode(false);
    setForgotStep(1);
    setForgotError('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
  };

  return (
    <div className="login-viewport">
      {/* Dynamic Background Atmosphere */}
      <div className="login-backdrop-glow" />
      <div className="login-backdrop-grid" />

      <div className="login-card-container">
        {/* Left Side: Brand & Architecture Pillars */}
        <div className="login-brand-panel">
          <div className="login-brand-header">
            <div className="brand-logo-badge">
              <Radio className="brand-icon" />
            </div>
            <div>
              <span className="brand-badge-pill">LOGISTICS GATEWAY</span>
              <h1 className="brand-title">ERB</h1>
              <p className="brand-subtitle">ERP to MAWM Logistics Gateway</p>
            </div>
          </div>

          <div className="login-ncs-hero-preview">
            <img
              src="/assets/warehouse_inventory_bg.jpg"
              alt="Smart Automated Warehouse &amp; Inventory Operations"
              className="ncs-preview-img"
            />
            <div className="preview-activity-overlay">
              <span className="activity-live-badge">Warehouse Ingestion Hub</span>
              <p className="activity-text">Inbound Purchase Orders (PO) • Advance Shipping Notices (ASN) • Multi-Facility Dispatch</p>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form / Database Verified Password Reset */}
        <div className="login-form-panel">
          {!isForgotMode ? (
            /* --- NORMAL LOGIN VIEW --- */
            <>
              <div className="form-header">
                <div className="security-shield-icon">
                  <ShieldCheck size={26} />
                </div>
                <h2>Sign In</h2>
              </div>

              {errorMsg && (
                <div className="login-error-banner">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label htmlFor="login-username">Username</label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter Username"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-with-hint">
                    <label htmlFor="login-password">Password</label>
                  </div>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-options">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="checkmark" />
                    Remember session
                  </label>

                  <button
                    type="button"
                    className="forgot-password-btn"
                    onClick={() => {
                      setIsForgotMode(true);
                      setForgotStep(1);
                      setForgotError('');
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Platform</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

            </>
          ) : (
            /* --- DATABASE-VERIFIED FORGOT PASSWORD VIEW --- */
            <>
              <button
                type="button"
                className="forgot-back-btn"
                onClick={handleReturnToLogin}
              >
                <ArrowLeft size={15} />
                <span>Return to Sign In</span>
              </button>

              <div className="form-header">
                <div className="security-shield-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <KeyRound size={26} />
                </div>
                <h2>Reset Gateway Password</h2>
                <p>Verify your registered email or username against database records to reset your password.</p>
              </div>

              {forgotError && (
                <div className="login-error-banner">
                  <AlertCircle size={16} />
                  <span>{forgotError}</span>
                </div>
              )}

              {/* STEP 1: Verify Email / Identifier against erp_users table */}
              {forgotStep === 1 && (
                <form onSubmit={handleVerifyIdentity} className="login-form">
                  <div className="forgot-steps-badge">
                    <span>Step 1 of 2: Database Account Verification</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="forgot-identifier">Registered Email Address or Username</label>
                    <div className="input-with-icon">
                      {forgotIdentifier.includes('@') ? (
                        <Mail size={18} className="input-icon" />
                      ) : (
                        <User size={18} className="input-icon" />
                      )}
                      <input
                        id="forgot-identifier"
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. lsakthivel@ncspartners.com or admin"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    The system will verify this email against the <code>erp_users</code> database. Once confirmed, you will be approved to set a new password.
                  </div>

                  {/* Registered Enterprise Accounts */}
                  <div className="demo-credentials-section" style={{ marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                    <span className="demo-title">Select Registered Account:</span>
                    <div className="demo-pills">
                      <button
                        type="button"
                        className="demo-pill"
                        onClick={() => setForgotIdentifier('lsakthivel@ncspartners.com')}
                      >
                        <Mail size={12} />
                        <span>lsakthivel@ncspartners.com</span>
                      </button>
                      <button
                        type="button"
                        className="demo-pill"
                        onClick={() => setForgotIdentifier('admin')}
                      >
                        <User size={12} />
                        <span>admin</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={forgotLoading}
                    style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                  >
                    {forgotLoading ? (
                      <>
                        <div className="btn-spinner" />
                        <span>Verifying in Database...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Account &amp; Proceed</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Enter New Password directly once approved */}
              {forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="login-form">
                  <div className="forgot-steps-badge">
                    <span>Step 2 of 2: Set New Password</span>
                  </div>

                  <div className="otp-target-banner" style={{ borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#10b981' }}>
                      <CheckCircle2 size={16} />
                      <span>Account Confirmed in Database</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: 3 }}>
                      User: <strong>{verifiedUserInfo?.fullName}</strong> ({verifiedUserInfo?.username})
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      Email: <code>{verifiedUserInfo?.email}</code>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 3 }}>
                      ✓ Verified against <code>erp_users</code>. Approved to update password.
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="new-password">New Password (min. 6 characters)</label>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <div className="btn-spinner" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Save New Password &amp; Continue</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: Success Confirmation */}
              {forgotStep === 3 && (
                <div className="password-success-panel">
                  <div className="success-icon-wrapper">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
                      Password Updated Successfully!
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                      Your credentials for <strong>{verifiedUserInfo?.username || 'your account'}</strong> have been securely updated in the database table <code>erp_users</code>.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="login-submit-btn"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    onClick={handleReturnToLogin}
                  >
                    <span>Sign In with New Password</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
