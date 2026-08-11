import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import './Navbar.css';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { notifications, markAsRead, markAllAsRead } = useSocket() || { notifications: [] };
    const [showNotifications, setShowNotifications] = React.useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="container navbar-container">
                <Link to="/" className="navbar-brand">
                    <div className="navbar-logo">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="navbar-brand-text">ProjectFlow</span>
                </Link>

                <div className="navbar-links">
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="navbar-link">Dashboard</Link>
                            <Link to="/projects" className="navbar-link">Projects</Link>
                            <Link to="/tasks" className="navbar-link">Tasks</Link>
                            <Link to="/productivity" className="navbar-link">Productivity</Link>
                            <Link to="/messages" className="navbar-link">Messages</Link>
                            {user?.role === 'admin' && (
                                <Link to="/admin" className="navbar-link" style={{ color: '#22c55e', fontWeight: 'bold' }}>
                                    🏢 Company Admin
                                </Link>
                            )}
                            {(user?.role === 'team_leader' || user?.role === 'super_admin') && (
                                <Link to="/admin" className="navbar-link" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                                    ⚡ Team Leader
                                </Link>
                            )}
                            <Link to="/feedback" className="navbar-link">Feedback</Link>
                        </>
                    ) : (
                        <>
                            <a href="#features" className="navbar-link">Features</a>
                            <a href="#pricing" className="navbar-link">Pricing</a>
                            <a href="#about" className="navbar-link">About</a>
                            <a href="#feedback" className="navbar-link">Feedback</a>
                        </>
                    )}
                </div>

                <div className="navbar-actions">
                    <button onClick={toggleTheme} className="btn btn-ghost theme-toggle" aria-label="Toggle theme">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    {isAuthenticated ? (
                        <>
                            <div className="navbar-notification">
                                <button 
                                    className="btn btn-ghost notification-bell" 
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    aria-label="Notifications"
                                >
                                    🔔
                                    {notifications?.filter(n => !n.isRead).length > 0 && (
                                        <span className="notification-badge">
                                            {notifications.filter(n => !n.isRead).length}
                                        </span>
                                    )}
                                </button>
                                {showNotifications && (
                                    <div className="notification-dropdown">
                                        <div className="notification-header">
                                            <h4>Notifications</h4>
                                            {notifications?.filter(n => !n.isRead).length > 0 && (
                                                <button onClick={markAllAsRead} className="btn-mark-all">Mark all as read</button>
                                            )}
                                        </div>
                                        <div className="notification-list">
                                            {notifications?.length === 0 ? (
                                                <div className="notification-empty">No new notifications</div>
                                            ) : (
                                                notifications?.map(notif => (
                                                    <div 
                                                        key={notif.id} 
                                                        className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                                                        onClick={() => {
                                                            markAsRead(notif.id);
                                                            if (notif.link) {
                                                                navigate(notif.link);
                                                                setShowNotifications(false);
                                                            }
                                                        }}
                                                    >
                                                        <div className="notification-title">{notif.title}</div>
                                                        <div className="notification-body">{notif.body}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Link to="/profile" className="navbar-user">
                                <div className="navbar-avatar">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="navbar-user-info">
                                    <span className="navbar-username">{user?.name}</span>
                                    <span className="navbar-company">{user?.company || ''}</span>
                                </div>
                                {user?.role === 'admin' && (
                                    <span className="navbar-role-badge admin-badge">Company Admin</span>
                                )}
                                {(user?.role === 'team_leader' || user?.role === 'super_admin') && (
                                    <span className="navbar-role-badge super-admin-badge" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>Team Leader</span>
                                )}
                                {user?.role === 'user' && (
                                    <span className="navbar-role-badge member-badge">Team Member</span>
                                )}
                            </Link>
                            <button onClick={handleLogout} className="btn btn-ghost">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-ghost">Sign In</Link>
                            <Link to="/register" className="btn btn-primary">Get Started</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
