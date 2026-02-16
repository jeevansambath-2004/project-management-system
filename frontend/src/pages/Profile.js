import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './Pages.css';

const Profile = () => {
    const { user } = useAuth();

    return (
        <div className="page">
            <Navbar />
            <main className="page-main">
                <div className="container">
                    <h1>Profile</h1>
                    <div className="card profile-card">
                        <div className="profile-avatar">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <h2>{user?.name || 'User'}</h2>
                        <p>{user?.email || 'user@example.com'}</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
