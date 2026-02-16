import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import ProjectDetails from '../pages/ProjectDetails';
import Tasks from '../pages/Tasks';
import Messages from '../pages/Messages';
import Profile from '../pages/Profile';
import NotFound from '../pages/NotFound';
import JoinProject from '../pages/JoinProject';
import KanbanBoard from '../pages/KanbanBoard';
import ScrumBoard from '../pages/ScrumBoard';

// Components
import PrivateRoute from '../components/PrivateRoute';

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:inviteCode" element={<JoinProject />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
                <PrivateRoute>
                    <Dashboard />
                </PrivateRoute>
            } />
            <Route path="/projects" element={
                <PrivateRoute>
                    <Projects />
                </PrivateRoute>
            } />
            <Route path="/projects/:id" element={
                <PrivateRoute>
                    <ProjectDetails />
                </PrivateRoute>
            } />
            <Route path="/tasks" element={
                <PrivateRoute>
                    <Tasks />
                </PrivateRoute>
            } />
            <Route path="/kanban" element={
                <PrivateRoute>
                    <KanbanBoard />
                </PrivateRoute>
            } />
            <Route path="/scrum" element={
                <PrivateRoute>
                    <ScrumBoard />
                </PrivateRoute>
            } />
            <Route path="/messages" element={
                <PrivateRoute>
                    <Messages />
                </PrivateRoute>
            } />
            <Route path="/profile" element={
                <PrivateRoute>
                    <Profile />
                </PrivateRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;
