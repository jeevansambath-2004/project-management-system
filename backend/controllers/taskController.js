const Task = require('../models/Task');
const Project = require('../models/Project');

// Helper function to get user's role in a project
const getUserRoleInProject = (project, userId) => {
    if (project.owner.toString() === userId) return 'owner';
    const member = project.members.find(m => m.user.toString() === userId);
    return member ? member.role : null;
};

// @desc    Get all tasks
// @route   GET /api/tasks
exports.getTasks = async (req, res) => {
    try {
        const { project, status, priority, assignee } = req.query;
        let query = {};

        if (project) query.project = project;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignee) query.assignee = assignee;

        const tasks = await Task.find(query)
            .populate('project', 'name color')
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('approvalRequestedBy', 'name email avatar')
            .sort('-createdAt');

        res.json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get tasks by project
// @route   GET /api/tasks/project/:projectId
exports.getTasksByProject = async (req, res) => {
    try {
        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('approvalRequestedBy', 'name email avatar')
            .sort('-createdAt');

        res.json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('project', 'name color')
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create task (admin/owner only)
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
    try {
        // Check if user has admin role in the project
        const project = await Project.findById(req.body.project);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const userRole = getUserRoleInProject(project, req.user.id);
        if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only project admins can create tasks' });
        }

        req.body.createdBy = req.user.id;
        const task = await Task.create(req.body);

        const populatedTask = await Task.findById(task._id)
            .populate('project', 'name color')
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email');

        res.status(201).json({ success: true, data: populatedTask });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update task (admin can update all fields, members can only update status)
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // New Rule: Cannot move back from Done
        if (task.status === 'done' && req.body.status && req.body.status !== 'done') {
            return res.status(400).json({ message: 'Tasks cannot be moved back after they are marked as Done' });
        }

        // Check user's role in the task's project
        const project = await Project.findById(task.project);
        const userRole = getUserRoleInProject(project, req.user.id);
        const isProjectAdmin = req.user.role === 'admin' || userRole === 'owner' || userRole === 'admin';

        // Members can only update status
        if (!isProjectAdmin) {
            // Only allow status update for members
            const allowedFields = ['status'];
            const updateFields = Object.keys(req.body);
            const isStatusOnly = updateFields.every(f => allowedFields.includes(f));

            if (!isStatusOnly) {
                return res.status(403).json({ message: 'Members can only update task status' });
            }
        }

        const isAdmin = req.user.role === 'admin' || userRole === 'owner' || userRole === 'admin';

        if (!isAdmin) {
            // Member update: only allow status change via approval request logic
            const updateFields = Object.keys(req.body);
            const statusChanging = updateFields.includes('status') && req.body.status !== task.status;

            if (updateFields.some(f => f !== 'status' && f !== 'title' && f !== 'description')) {
                 return res.status(403).json({ message: 'Members can only update basic task info or status' });
            }

            if (statusChanging) {
                const requestedStatus = req.body.status;
                delete req.body.status; // Don't update status directly

                // Update basic info and set approval request
                task = await Task.findByIdAndUpdate(req.params.id, {
                    ...req.body,
                    approvalStatus: 'pending',
                    requestedStatus: requestedStatus,
                    previousStatus: task.status,
                    approvalRequestedBy: req.user.id,
                    approvalRequestedAt: new Date()
                }, { new: true })
                .populate('project', 'name color')
                .populate('assignee', 'name email avatar')
                .populate('approvalRequestedBy', 'name email avatar');

                return res.json({ 
                    success: true, 
                    data: task, 
                    message: 'Task updated and stage change request submitted' 
                });
            }
        }

        // Admin update: reset approval fields if status is changed directly
        if (isAdmin && req.body.status && req.body.status !== task.status) {
            req.body.approvalStatus = 'none';
            req.body.requestedStatus = null;
            req.body.previousStatus = null;
            req.body.approvalRequestedBy = null;
            req.body.approvalRequestedAt = null;

            if (req.body.status === 'done') {
                req.body.completedAt = new Date();
            }
        }

        task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })
            .populate('project', 'name color')
            .populate('assignee', 'name email avatar')
            .populate('approvalRequestedBy', 'name email avatar');

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update task status (admins update directly, members create approval request)
// @route   PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;

        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // New Rule: Cannot move back from Done
        if (task.status === 'done' && status !== 'done') {
            return res.status(400).json({ message: 'Tasks cannot be moved back after they are marked as Done' });
        }

        // Check user's role in the task's project
        const project = await Project.findById(task.project);
        const userRole = getUserRoleInProject(project, req.user.id);
        const isAdmin = req.user.role === 'admin' || userRole === 'owner' || userRole === 'admin';

        if (isAdmin) {
            // Admin can update status directly
            const updateData = {
                status,
                approvalStatus: 'none',
                requestedStatus: null,
                previousStatus: null,
                approvalRequestedBy: null,
                approvalRequestedAt: null
            };

            if (status === 'done') {
                updateData.completedAt = new Date();
            }

            task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true })
                .populate('assignee', 'name email avatar')
                .populate('approvalRequestedBy', 'name email avatar');

            return res.json({ success: true, data: task });
        } else {
            // Member: create an approval request instead of directly updating
            if (task.status === status) {
                return res.status(400).json({ message: 'Task is already in this stage' });
            }

            if (task.approvalStatus === 'pending') {
                return res.status(400).json({ message: 'There is already a pending approval request for this task' });
            }

            task = await Task.findByIdAndUpdate(req.params.id, {
                approvalStatus: 'pending',
                requestedStatus: status,
                previousStatus: task.status,
                approvalRequestedBy: req.user.id,
                approvalRequestedAt: new Date()
            }, { new: true })
                .populate('assignee', 'name email avatar')
                .populate('approvalRequestedBy', 'name email avatar');

            return res.json({
                success: true,
                data: task,
                message: 'Stage change request submitted for approval'
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Request stage change (member action)
// @route   PATCH /api/tasks/:id/request-stage-change
exports.requestStageChange = async (req, res) => {
    try {
        const { requestedStatus } = req.body;

        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // New Rule: Cannot move back from Done
        if (task.status === 'done' && requestedStatus !== 'done') {
            return res.status(400).json({ message: 'Tasks cannot be moved back after they are marked as Done' });
        }

        if (task.status === requestedStatus) {
            return res.status(400).json({ message: 'Task is already in this stage' });
        }

        if (task.approvalStatus === 'pending') {
            return res.status(400).json({ message: 'There is already a pending approval request for this task' });
        }

        task = await Task.findByIdAndUpdate(req.params.id, {
            approvalStatus: 'pending',
            requestedStatus: requestedStatus,
            previousStatus: task.status,
            approvalRequestedBy: req.user.id,
            approvalRequestedAt: new Date()
        }, { new: true })
            .populate('assignee', 'name email avatar')
            .populate('approvalRequestedBy', 'name email avatar');

        res.json({
            success: true,
            data: task,
            message: 'Stage change request submitted for approval'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Approve stage change (admin/owner only)
// @route   PATCH /api/tasks/:id/approve-stage
exports.approveStageChange = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user has admin role in the project
        const project = await Project.findById(task.project);
        const userRole = getUserRoleInProject(project, req.user.id);
        if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can approve stage changes' });
        }

        if (task.approvalStatus !== 'pending') {
            return res.status(400).json({ message: 'No pending approval request for this task' });
        }

        const updateData = {
            status: task.requestedStatus,
            approvalStatus: 'none',
            requestedStatus: null,
            previousStatus: null,
            approvalRequestedBy: null,
            approvalRequestedAt: null
        };

        if (task.requestedStatus === 'done') {
            updateData.completedAt = new Date();
        }

        task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('assignee', 'name email avatar')
            .populate('approvalRequestedBy', 'name email avatar');

        res.json({
            success: true,
            data: task,
            message: 'Stage change approved'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reject stage change (admin/owner only) — task goes back to previous stage
// @route   PATCH /api/tasks/:id/reject-stage
exports.rejectStageChange = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user has admin role in the project
        const project = await Project.findById(task.project);
        const userRole = getUserRoleInProject(project, req.user.id);
        if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can reject stage changes' });
        }

        if (task.approvalStatus !== 'pending') {
            return res.status(400).json({ message: 'No pending approval request for this task' });
        }

        // Reject — keep the task in the current/previous status
        task = await Task.findByIdAndUpdate(req.params.id, {
            approvalStatus: 'none',
            requestedStatus: null,
            previousStatus: null,
            approvalRequestedBy: null,
            approvalRequestedAt: null
        }, { new: true })
            .populate('assignee', 'name email avatar')
            .populate('approvalRequestedBy', 'name email avatar');

        res.json({
            success: true,
            data: task,
            message: 'Stage change rejected. Task remains in current stage.'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get pending approval tasks for a project
// @route   GET /api/tasks/pending-approvals/:projectId
exports.getPendingApprovals = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only admin/owner can view pending approvals
        const userRole = getUserRoleInProject(project, req.user.id);
        if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view pending approvals' });
        }

        const pendingTasks = await Task.find({
            project: req.params.projectId,
            approvalStatus: 'pending'
        })
            .populate('assignee', 'name email avatar')
            .populate('approvalRequestedBy', 'name email avatar')
            .populate('createdBy', 'name email')
            .sort('-approvalRequestedAt');

        res.json({ success: true, count: pendingTasks.length, data: pendingTasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Assign task (admin/owner only)
// @route   PATCH /api/tasks/:id/assign
exports.assignTask = async (req, res) => {
    try {
        const existingTask = await Task.findById(req.params.id);
        if (!existingTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user has admin role in the project
        const project = await Project.findById(existingTask.project);
        const userRole = getUserRoleInProject(project, req.user.id);
        if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only project admins can assign tasks' });
        }

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { assignee: req.body.userId },
            { new: true }
        ).populate('assignee', 'name email avatar');

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete task (admin/owner only)
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user has admin role in the project
        const project = await Project.findById(task.project);
        const userRole = getUserRoleInProject(project, req.user.id);
        if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only project admins can delete tasks' });
        }

        await task.deleteOne();
        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Bulk update task positions (for drag and drop)
// @route   PATCH /api/tasks/reorder
exports.reorderTasks = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { id, status, position }

        const bulkOps = updates.map(update => ({
            updateOne: {
                filter: { _id: update.id },
                update: {
                    $set: {
                        status: update.status,
                        position: update.position,
                        ...(update.status === 'done' ? { completedAt: new Date() } : {})
                    }
                }
            }
        }));

        await Task.bulkWrite(bulkOps);

        res.json({ success: true, message: 'Tasks reordered' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get backlog tasks (tasks without a sprint)
// @route   GET /api/tasks/backlog/:projectId
exports.getBacklogTasks = async (req, res) => {
    try {
        const tasks = await Task.find({
            project: req.params.projectId,
            sprint: { $exists: false }
        })
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email')
            .sort('position');

        res.json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get tasks by sprint
// @route   GET /api/tasks/sprint/:sprintId
exports.getTasksBySprint = async (req, res) => {
    try {
        const tasks = await Task.find({ sprint: req.params.sprintId })
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('project', 'name color')
            .sort('position');

        res.json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Assign task to sprint
// @route   PATCH /api/tasks/:id/sprint
exports.assignToSprint = async (req, res) => {
    try {
        const { sprintId } = req.body;

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { sprint: sprintId || null },
            { new: true }
        )
            .populate('project', 'name color')
            .populate('assignee', 'name email avatar');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get team progress for a project (tasks per member)
// @route   GET /api/tasks/team-progress/:projectId
exports.getTeamProgress = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only admin/owner can view team progress
        const userRole = getUserRoleInProject(project, req.user.id);
        if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view team progress' });
        }

        // Aggregate tasks by assignee for this project
        const tasksByAssignee = await Task.aggregate([
            { $match: { project: project._id } },
            {
                $group: {
                    _id: '$assignee',
                    total: { $sum: 1 },
                    todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
                    review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
                    done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
                    // Story points tracking per status
                    totalStoryPoints: { $sum: { $ifNull: ['$storyPoints', 0] } },
                    todoPoints: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, { $ifNull: ['$storyPoints', 0] }, 0] } },
                    inProgressPoints: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, { $ifNull: ['$storyPoints', 0] }, 0] } },
                    reviewPoints: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, { $ifNull: ['$storyPoints', 0] }, 0] } },
                    donePoints: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, { $ifNull: ['$storyPoints', 0] }, 0] } }
                }
            }
        ]);

        // Build a map: userId -> stats
        const statsMap = {};
        tasksByAssignee.forEach(item => {
            statsMap[item._id?.toString()] = item;
        });

        // Build team list with owner + members
        const teamMembers = [
            { user: project.owner, role: 'owner' },
            ...project.members.map(m => ({ user: m.user, role: m.role }))
        ];

        const progress = teamMembers.map(({ user, role }) => {
            if (!user) return null;
            const stats = statsMap[user._id?.toString()] || {
                total: 0, todo: 0, inProgress: 0, review: 0, done: 0,
                totalStoryPoints: 0, todoPoints: 0, inProgressPoints: 0, reviewPoints: 0, donePoints: 0
            };
            return {
                user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar },
                role,
                total: stats.total,
                todo: stats.todo,
                inProgress: stats.inProgress,
                review: stats.review,
                done: stats.done,
                completionRate: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
                // Story points data
                totalStoryPoints: stats.totalStoryPoints || 0,
                todoPoints: stats.todoPoints || 0,
                inProgressPoints: stats.inProgressPoints || 0,
                reviewPoints: stats.reviewPoints || 0,
                donePoints: stats.donePoints || 0,
                earnedPoints: (stats.inProgressPoints || 0) + (stats.reviewPoints || 0) + (stats.donePoints || 0)
            };
        }).filter(Boolean);

        // Also include tasks assigned to no one
        const unassignedStats = statsMap['null'] || statsMap['undefined'] || {
            total: 0, todo: 0, inProgress: 0, review: 0, done: 0,
            totalStoryPoints: 0, todoPoints: 0, inProgressPoints: 0, reviewPoints: 0, donePoints: 0
        };

        res.json({
            success: true,
            data: {
                project: { _id: project._id, name: project.name, color: project.color },
                team: progress,
                unassigned: {
                    total: unassignedStats.total || 0,
                    todo: unassignedStats.todo || 0,
                    inProgress: unassignedStats.inProgress || 0,
                    review: unassignedStats.review || 0,
                    done: unassignedStats.done || 0,
                    totalStoryPoints: unassignedStats.totalStoryPoints || 0,
                    earnedPoints: (unassignedStats.inProgressPoints || 0) + (unassignedStats.reviewPoints || 0) + (unassignedStats.donePoints || 0)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

