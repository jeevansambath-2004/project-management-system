const express = require('express');
const router = express.Router();
const {
    getAdminStats,
    getAllUsers,
    updateUserRole,
    deleteUser,
    getAllProjects,
    deleteProject
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Admin routes require authentication + admin or team_leader role
router.use(protect);
router.use(authorize('admin', 'team_leader', 'super_admin'));

// Dashboard stats
router.get('/stats', getAdminStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Project management
router.get('/projects', getAllProjects);
router.delete('/projects/:id', deleteProject);

module.exports = router;
