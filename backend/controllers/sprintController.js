const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Get all sprints for a project
// @route   GET /api/sprints/project/:projectId
// @access  Private
exports.getSprintsByProject = async (req, res) => {
    try {
        const sprints = await Sprint.find({ project: req.params.projectId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name');

        res.status(200).json({
            success: true,
            count: sprints.length,
            data: sprints
        });
    } catch (error) {
        console.error('Error fetching sprints:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get active sprint for a project
// @route   GET /api/sprints/project/:projectId/active
// @access  Private
exports.getActiveSprint = async (req, res) => {
    try {
        const sprint = await Sprint.findOne({
            project: req.params.projectId,
            status: 'active'
        }).populate('createdBy', 'name');

        res.status(200).json({
            success: true,
            data: sprint
        });
    } catch (error) {
        console.error('Error fetching active sprint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single sprint
// @route   GET /api/sprints/:id
// @access  Private
exports.getSprint = async (req, res) => {
    try {
        const sprint = await Sprint.findById(req.params.id)
            .populate('createdBy', 'name');

        if (!sprint) {
            return res.status(404).json({
                success: false,
                message: 'Sprint not found'
            });
        }

        res.status(200).json({
            success: true,
            data: sprint
        });
    } catch (error) {
        console.error('Error fetching sprint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create new sprint
// @route   POST /api/sprints
// @access  Private
exports.createSprint = async (req, res) => {
    try {
        const { name, project, goal, startDate, endDate } = req.body;

        // Check if project exists and user has access
        const projectDoc = await Project.findById(project);
        if (!projectDoc) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const sprint = await Sprint.create({
            name,
            project,
            goal,
            startDate,
            endDate,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: sprint
        });
    } catch (error) {
        console.error('Error creating sprint:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Update sprint
// @route   PUT /api/sprints/:id
// @access  Private
exports.updateSprint = async (req, res) => {
    try {
        let sprint = await Sprint.findById(req.params.id);

        if (!sprint) {
            return res.status(404).json({
                success: false,
                message: 'Sprint not found'
            });
        }

        sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: sprint
        });
    } catch (error) {
        console.error('Error updating sprint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Start sprint
// @route   PATCH /api/sprints/:id/start
// @access  Private
exports.startSprint = async (req, res) => {
    try {
        let sprint = await Sprint.findById(req.params.id);

        if (!sprint) {
            return res.status(404).json({
                success: false,
                message: 'Sprint not found'
            });
        }

        // Deactivate any other active sprints in the same project
        await Sprint.updateMany(
            { project: sprint.project, status: 'active' },
            { status: 'planning' }
        );

        sprint = await Sprint.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        );

        res.status(200).json({
            success: true,
            data: sprint
        });
    } catch (error) {
        console.error('Error starting sprint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Complete sprint
// @route   PATCH /api/sprints/:id/complete
// @access  Private
exports.completeSprint = async (req, res) => {
    try {
        let sprint = await Sprint.findById(req.params.id);

        if (!sprint) {
            return res.status(404).json({
                success: false,
                message: 'Sprint not found'
            });
        }

        // Move incomplete tasks back to backlog (remove sprint reference)
        await Task.updateMany(
            { sprint: sprint._id, status: { $ne: 'done' } },
            { $unset: { sprint: 1 } }
        );

        sprint = await Sprint.findByIdAndUpdate(
            req.params.id,
            { status: 'completed' },
            { new: true }
        );

        res.status(200).json({
            success: true,
            data: sprint
        });
    } catch (error) {
        console.error('Error completing sprint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete sprint
// @route   DELETE /api/sprints/:id
// @access  Private
exports.deleteSprint = async (req, res) => {
    try {
        const sprint = await Sprint.findById(req.params.id);

        if (!sprint) {
            return res.status(404).json({
                success: false,
                message: 'Sprint not found'
            });
        }

        // Remove sprint reference from all tasks
        await Task.updateMany(
            { sprint: sprint._id },
            { $unset: { sprint: 1 } }
        );

        await sprint.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error('Error deleting sprint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
