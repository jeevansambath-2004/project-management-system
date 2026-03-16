const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
exports.getAdminStats = async (req, res) => {
    try {
        const [totalUsers, totalProjects, totalTasks, recentUsers, recentProjects] = await Promise.all([
            User.countDocuments(),
            Project.countDocuments(),
            Task.countDocuments(),
            User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt authProvider avatar'),
            Project.find().sort({ createdAt: -1 }).limit(5).populate('owner', 'name email').select('name status priority owner members createdAt color')
        ]);

        // Task stats by status
        const tasksByStatus = await Task.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Projects by status
        const projectsByStatus = await Project.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Users by auth provider
        const usersByProvider = await User.aggregate([
            { $group: { _id: '$authProvider', count: { $sum: 1 } } }
        ]);

        // Users created per month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const userGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Admin count
        const adminCount = await User.countDocuments({ role: 'admin' });

        // System-wide activity (last 9 months)
        const nineMonthsAgo = new Date();
        nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);
        const systemActivity = await Task.aggregate([
            { $match: { status: 'done', completedAt: { $gte: nineMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
                    count: { $sum: 1 },
                    points: { $sum: { $ifNull: ['$storyPoints', 0] } }
                }
            },
            { $sort: { '_id': 1 } }
        ]).then(results => results.map(r => ({
            date: r._id,
            count: r.count,
            points: r.points
        })));

        res.json({
            success: true,
            data: {
                totalUsers,
                totalProjects,
                totalTasks,
                adminCount,
                tasksByStatus,
                projectsByStatus,
                usersByProvider,
                userGrowth,
                recentUsers,
                recentProjects,
                systemActivity
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all users (admin)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = '' } = req.query;
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update user role (admin)
// @route   PUT /api/admin/users/:id/role
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be user or admin' });
        }

        // Prevent admin from changing their own role
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'You cannot change your own role' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own account from admin panel' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove user from all project memberships
        await Project.updateMany(
            { 'members.user': req.params.id },
            { $pull: { members: { user: req.params.id } } }
        );

        // Delete projects owned by this user
        await Project.deleteMany({ owner: req.params.id });

        // Unassign tasks assigned to this user
        await Task.updateMany(
            { assignee: req.params.id },
            { $unset: { assignee: '' } }
        );

        await User.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all projects (admin)
// @route   GET /api/admin/projects
exports.getAllProjects = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '' } = req.query;
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (status) {
            query.status = status;
        }

        const [projects, total] = await Promise.all([
            Project.find(query)
                .populate('owner', 'name email avatar')
                .populate('members.user', 'name email avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Project.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: projects,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete project (admin)
// @route   DELETE /api/admin/projects/:id
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Delete all tasks in the project
        await Task.deleteMany({ project: req.params.id });

        await Project.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Project and its tasks deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
