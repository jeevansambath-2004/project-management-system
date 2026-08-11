import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import './AdminAccess.css';

const AdminAccess = () => {
    const { user, isAuthenticated, login, googleLogin, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        company: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await login(formData);
            if (data.user.role === 'team_leader' || data.user.role === 'super_admin' || data.user.role === 'admin') {
                navigate('/admin');
            } else {
                setError('Access denied. This portal is restricted to Team Leaders and Administrators.');
                setLoading(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
            setLoading(false);
        }
    };

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoResponse.json();
                
                const data = await googleLogin(tokenResponse.access_token, userInfo);
                if (data.user.role === 'team_leader' || data.user.role === 'super_admin' || data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    setError('Access denied. Your Google account does not have Team Leader or Admin privileges.');
                    setLoading(false);
                }
            } catch (err) {
                console.error('Google admin login failed:', err);
                setError('Google authentication failed.');
                setLoading(false);
            }
        },
        onError: () => {
            console.error('Google login failed');
            setError('Google login window closed or failed.');
        }
    });

    // If already authenticated and is team_leader / super_admin / admin
    if (isAuthenticated && (user?.role === 'team_leader' || user?.role === 'super_admin' || user?.role === 'admin')) {
        return (
            <div className="admin-access-page">
                <ThemeToggle />
                <div className="admin-access-bg">
                    <div className="admin-access-glow admin-access-glow-1"></div>
                    <div className="admin-access-glow admin-access-glow-2"></div>
                    <div className="admin-access-glow admin-access-glow-3"></div>
                    <div className="admin-access-grid"></div>
                    <div className="admin-access-particles">
                        <div className="admin-particle"></div>
                        <div className="admin-particle"></div>
                        <div className="admin-particle"></div>
                        <div className="admin-particle"></div>
                        <div className="admin-particle"></div>
                        <div className="admin-particle"></div>
                    </div>
                </div>

                <div className="admin-access-container">
                    <Link to="/" className="admin-access-logo">
                        <div className="admin-access-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span>ProjectFlow</span>
                    </Link>

                    <div className="admin-access-card">
                        <div className="admin-access-shield">
                            <div className="admin-access-shield-icon">🛡️</div>
                        </div>

                        <div className="admin-access-header">
                            <h1 className="admin-access-title">Team Leader Access Granted</h1>
                            <p className="admin-access-subtitle">
                                You are authenticated as a Team Leader
                            </p>
                        </div>

                        <div className="admin-access-logged-in">
                            <div className="admin-access-user-info">
                                <div className="admin-access-avatar">
                                    {user?.name?.charAt(0).toUpperCase() || 'L'}
                                </div>
                                <div>
                                    <div className="admin-access-user-name">{user?.name}</div>
                                    <span className="admin-access-user-role role-admin" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>⚡ Team Leader</span>
                                </div>
                            </div>

                            <Link to="/admin" className="admin-access-enter-btn">
                                <span>Enter Team Leader Panel</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M5 12h14" />
                                    <path d="M12 5l7 7-7 7" />
                                </svg>
                            </Link>

                            <Link to="/dashboard" className="admin-access-back">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5" />
                                    <path d="M12 19l-7-7 7-7" />
                                </svg>
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // If authenticated but NOT team_leader / admin
    if (isAuthenticated && user?.role !== 'team_leader' && user?.role !== 'super_admin' && user?.role !== 'admin') {
        return (
            <div className="admin-access-page">
                <div className="admin-access-bg">
                    <div className="admin-access-glow admin-access-glow-1"></div>
                    <div className="admin-access-glow admin-access-glow-2"></div>
                    <div className="admin-access-glow admin-access-glow-3"></div>
                    <div className="admin-access-grid"></div>
                </div>

                <div className="admin-access-container">
                    <Link to="/" className="admin-access-logo">
                        <div className="admin-access-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span>ProjectFlow</span>
                    </Link>

                    <div className="admin-access-card">
                        <div className="admin-access-denied">
                            <div className="admin-access-denied-icon">🚫</div>
                            <h3>Access Denied</h3>
                            <p>
                                You are logged in as <strong>{user?.name}</strong>, but your account does not have Team Leader privileges. The Team Leader portal is reserved for team leaders and company administrators. Please contact your administrator.
                            </p>
                            <Link to="/dashboard" className="admin-access-go-dashboard">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                    <path d="M19 12H5" />
                                    <path d="M12 19l-7-7 7-7" />
                                </svg>
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: Not authenticated - show admin login form
    return (
        <div className="admin-access-page">
            <ThemeToggle />
            <div className="admin-access-bg">
                <div className="admin-access-glow admin-access-glow-1"></div>
                <div className="admin-access-glow admin-access-glow-2"></div>
                <div className="admin-access-glow admin-access-glow-3"></div>
                <div className="admin-access-grid"></div>
                <div className="admin-access-particles">
                    <div className="admin-particle"></div>
                    <div className="admin-particle"></div>
                    <div className="admin-particle"></div>
                    <div className="admin-particle"></div>
                    <div className="admin-particle"></div>
                    <div className="admin-particle"></div>
                </div>
            </div>

            <div className="admin-access-container">
                <Link to="/" className="admin-access-logo">
                    <div className="admin-access-logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span>ProjectFlow</span>
                </Link>

                <div className="admin-access-card">
                    <div className="admin-access-shield">
                        <div className="admin-access-shield-icon">🔐</div>
                    </div>

                    <div className="admin-access-header">
                        <h1 className="admin-access-title">⚡ Team Leader Portal</h1>
                        <p className="admin-access-subtitle">
                            Team Leader login. Authenticate to manage your project team and tasks.
                        </p>
                        <div className="admin-access-security-badge">
                            🔒 Secure Authentication
                        </div>
                    </div>

                    {error && (
                        <div className="admin-access-error">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="admin-access-form">
                        <div className="form-group">
                            <label htmlFor="admin-company" className="form-label">
                                <span className="form-label-icon">🏢</span>
                                Company
                            </label>
                            <input
                                type="text"
                                id="admin-company"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                className="admin-input"
                                placeholder="Enter your company name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="admin-email" className="form-label">
                                <span className="form-label-icon">📧</span>
                                Admin Email
                            </label>
                            <input
                                type="email"
                                id="admin-email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="admin-input"
                                placeholder="admin@yourcompany.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="admin-password" className="form-label">
                                <span className="form-label-icon">🔑</span>
                                Password
                            </label>
                            <div className="admin-input-password">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="admin-password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="admin-input"
                                    placeholder="Enter admin password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="admin-password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="admin-access-submit"
                            disabled={loading || authLoading}
                        >
                            {loading ? (
                                <span>
                                    <div className="admin-access-spinner"></div>
                                    Authenticating...
                                </span>
                            ) : (
                                <span>
                                    ⚡ Access Team Leader Panel
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="auth-divider" style={{ margin: '24px 0', display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <span style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></span>
                        <span style={{ padding: '0 10px', fontSize: '13px' }}>or continue with</span>
                        <span style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></span>
                    </div>

                    <button
                        type="button"
                        className="btn btn-google btn-lg"
                        style={{ width: '100%', marginBottom: '24px' }}
                        onClick={() => handleGoogleLogin()}
                        disabled={loading || authLoading}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>

                    <div className="admin-access-info">
                        <div className="admin-access-info-item">
                            <div className="admin-access-info-icon">🔐</div>
                            <span>256-bit encrypted connection</span>
                        </div>
                        <div className="admin-access-info-item">
                            <div className="admin-access-info-icon">📋</div>
                            <span>All access attempts are logged and monitored</span>
                        </div>
                        <div className="admin-access-info-item">
                            <div className="admin-access-info-icon">⏱️</div>
                            <span>Session auto-expires for security</span>
                        </div>
                    </div>
                </div>

                <Link to="/login" className="admin-access-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                    </svg>
                    Back to Team Member Login
                </Link>
            </div>
        </div>
    );
};

export default AdminAccess;
