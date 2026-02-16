const Task = require('../models/Task');
const Project = require('../models/Project');

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

// @desc    Create task
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
    try {
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

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Update completedAt if status changes to done
        if (req.body.status === 'done' && task.status !== 'done') {
            req.body.completedAt = new Date();
        }

        task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })
            .populate('project', 'name color')
            .populate('assignee', 'name email avatar');

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const updateData = { status };

        if (status === 'done') {
            updateData.completedAt = new Date();
        }

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('assignee', 'name email avatar');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Assign task
// @route   PATCH /api/tasks/:id/assign
exports.assignTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { assignee: req.body.userId },
            { new: true }
        ).populate('assignee', 'name email avatar');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
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
