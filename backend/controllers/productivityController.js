const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get employee leaderboard
// @route   GET /api/productivity/leaderboard
// @access  Private
exports.getLeaderboard = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const matchStage = {};

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If users have company, filter by company. For now, filter by company if present.
        if (user.companyId) {
            // Find all users in the same company
            const companyUsers = await User.find({ companyId: user.companyId }).select('_id');
            const companyUserIds = companyUsers.map(u => u._id);
            matchStage.assignee = { $in: companyUserIds };
        }

        matchStage.status = 'done';

        // Group by assignee
        const leaderboardData = await Task.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$assignee',
                    tasksCompleted: { $sum: 1 },
                    totalPoints: { $sum: '$storyPoints' },
                    lastActiveDate: { $max: '$completedAt' }
                }
            },
            { $sort: { totalPoints: -1, lastActiveDate: -1 } }
        ]);

        // Populate user details
        const populatedLeaderboard = await User.populate(leaderboardData, { path: '_id', select: 'name email avatar' });

        const formattedLeaderboard = populatedLeaderboard
            .filter(item => item._id != null) // Ensure user still exists
            .map((item, index) => ({
                rank: index + 1,
                user: item._id,
                tasksCompleted: item.tasksCompleted,
                points: item.totalPoints,
                lastActiveDate: item.lastActiveDate
            }));

        res.json({ success: true, data: formattedLeaderboard });
    } catch (error) {
        console.error('SERVER_ERR:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
    }
};

// @desc    Get user activity (tasks completed per day)
// @route   GET /api/productivity/activity
// @access  Private
exports.getUserActivity = async (req, res) => {
    try {
        const scope = req.query.scope; // 'all' = all members, otherwise current user
        const userId = req.query.userId || req.user.id;

        // Build query - if scope=all, get all completed tasks; otherwise filter by user
        const query = {
            status: 'done',
            completedAt: { $exists: true }
        };
        if (scope !== 'all') {
            query.assignee = userId;
        }

        const tasks = await Task.find(query).select('completedAt storyPoints');

        // Group by date
        const activityMap = {};

        tasks.forEach(task => {
            if (task.completedAt) {
                const date = task.completedAt.toISOString().split('T')[0];
                if (!activityMap[date]) {
                    activityMap[date] = { count: 0, points: 0 };
                }
                activityMap[date].count += 1;
                activityMap[date].points += (task.storyPoints || 0);
            }
        });

        const activityData = Object.keys(activityMap).map(date => ({
            date,
            count: activityMap[date].count,
            points: activityMap[date].points
        }));

        res.json({ success: true, data: activityData });
    } catch (error) {
        console.error('ACTIVITY_ERR:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
    }
};
