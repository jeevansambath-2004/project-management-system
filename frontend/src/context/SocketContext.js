import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

// ---------------------------------------------------------------------------
// Helper: fire a browser notification that REDIRECTS on click.
// Uses the Service Worker's showNotification API when available (all browsers),
// which correctly handles clicks even when the tab is backgrounded.
// Falls back to the legacy Notification() constructor for older browsers.
// ---------------------------------------------------------------------------
async function showBrowserNotification(title, body, link) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Prefer Service Worker notification (works in Edge, Firefox, Chrome, Safari 16.4+)
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(title, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                data: { link }
            });
            return;
        } catch (e) {
            // fall through to legacy
        }
    }

    // Legacy fallback (still works; click handling via .onclick)
    const notif = new Notification(title, { body, icon: '/favicon.ico' });
    notif.onclick = function () {
        window.focus();
        if (link) window.location.href = link;
        this.close();
    };
}

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [activeToast, setActiveToast] = useState(null);
    const toastTimerRef = useRef(null);
    const { user, isAuthenticated } = useAuth();

    // ---- Register Service Worker once ----
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.warn('SW registration failed:', err));
        }

        // Request permission early
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const showToast = (notif) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setActiveToast(notif);
        toastTimerRef.current = setTimeout(() => setActiveToast(null), 5000);
    };

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const serverUrl = process.env.REACT_APP_API_URL
            ? process.env.REACT_APP_API_URL.replace('/api', '')
            : 'http://localhost:5000';

        const newSocket = io(serverUrl);

        newSocket.on('connect', () => {
            console.log('Socket connected');
            newSocket.emit('join', user.id);
        });

        newSocket.on('notification', (data) => {
            console.log('Notification received:', data);

            const entry = {
                id: `${Date.now()}-${Math.random()}`,
                ...data,
                isRead: false,
                createdAt: new Date()
            };

            setNotifications(prev => [entry, ...prev]);
            showToast(entry);
            showBrowserNotification(data.title, data.body, data.link);
        });

        setSocket(newSocket);

        // ---- Deadline check ----
        const checkDeadlines = async () => {
            try {
                const response = await api.get(`/tasks?status=todo,in-progress,review`);
                const tasks = (response.data.data || []).filter(
                    t => t.assignee && (t.assignee._id === user.id || t.assignee === user.id)
                );
                const now = new Date();
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                tasks.forEach(task => {
                    if (!task.dueDate || task.status === 'done') return;
                    const dueDate = new Date(task.dueDate);
                    if (dueDate > now && dueDate <= tomorrow) {
                        const entry = {
                            id: `deadline-${task._id}`,
                            type: 'deadline',
                            title: '⏰ Task Due Soon',
                            body: `"${task.title}" is due on ${dueDate.toLocaleDateString()}`,
                            link: '/tasks',
                            isRead: false,
                            createdAt: new Date()
                        };
                        setNotifications(prev => {
                            if (prev.find(n => n.id === entry.id)) return prev;
                            showToast(entry);
                            showBrowserNotification(entry.title, entry.body, entry.link);
                            return [entry, ...prev];
                        });
                    }
                });
            } catch (err) {
                console.error('Deadline check error:', err);
            }
        };

        checkDeadlines();

        return () => {
            newSocket.disconnect();
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [isAuthenticated, user]);

    const markAsRead = (id) =>
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

    const markAllAsRead = () =>
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    const clearNotifications = () => setNotifications([]);

    // Icon per notification type
    const typeIcon = {
        message: '💬',
        task: '✅',
        task_request: '🔄',
        project: '📁',
        user_joined: '👤',
        deadline: '⏰'
    };

    return (
        <SocketContext.Provider value={{ socket, notifications, markAsRead, markAllAsRead, clearNotifications }}>
            {children}

            {/* ---- In-App Toast ---- */}
            {activeToast && (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        setActiveToast(null);
                        if (activeToast.link) window.location.href = activeToast.link;
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && activeToast.link) window.location.href = activeToast.link;
                    }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        backgroundColor: 'var(--bg-card, #1e293b)',
                        border: '1px solid var(--border-color, #334155)',
                        borderLeft: '4px solid var(--primary-500, #6366f1)',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                        zIndex: 9999,
                        maxWidth: '340px',
                        minWidth: '260px',
                        cursor: activeToast.link ? 'pointer' : 'default',
                        animation: 'toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>
                                {typeIcon[activeToast.type] || '🔔'}
                            </span>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary, #f1f5f9)', lineHeight: 1.3 }}>
                                {activeToast.title}
                            </strong>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '18px', lineHeight: 1, padding: '0 2px',
                                color: 'var(--text-tertiary, #64748b)', flexShrink: 0
                            }}
                            aria-label="Dismiss"
                        >×</button>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', paddingLeft: '26px' }}>
                        {activeToast.body}
                    </p>
                    {activeToast.link && (
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--primary-400, #818cf8)', paddingLeft: '26px', marginTop: '2px' }}>
                            Click to open →
                        </p>
                    )}
                </div>
            )}

            <style>{`
                @keyframes toastSlideIn {
                    from { transform: translateX(110%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </SocketContext.Provider>
    );
};
