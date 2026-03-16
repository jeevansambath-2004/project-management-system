const Project = require('../models/Project');

// @desc    Get all projects for user
// @route   GET /api/projects
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id }
            ]
        })
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar')
            .sort('-createdAt');

        res.json({ success: true, count: projects.length, data: projects });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
exports.getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create project
// @route   POST /api/projects
exports.createProject = async (req, res) => {
    try {
        req.body.owner = req.user.id;
        const project = await Project.create(req.body);

        const populatedProject = await Project.findById(project._id)
            .populate('owner', 'name email avatar');

        res.status(201).json({ success: true, data: populatedProject });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res) => {
    try {
        let project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check ownership
        if (project.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this project' });
        }

        project = await Project.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('owner', 'name email avatar');

        res.json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this project' });
        }

        await project.deleteOne();
        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
exports.addMember = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const { userId, role = 'member' } = req.body;

        // Check if already a member
        const isMember = project.members.some(m => m.user.toString() === userId);
        if (isMember) {
            return res.status(400).json({ message: 'User is already a member' });
        }

        project.members.push({ user: userId, role });
        await project.save();

        const updatedProject = await Project.findById(req.params.id)
            .populate('members.user', 'name email avatar');

        res.json({ success: true, data: updatedProject });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
exports.removeMember = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        project.members = project.members.filter(
            m => m.user && m.user.toString() !== req.params.userId
        );
        await project.save();

        res.json({ success: true, message: 'Member removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update member role in project
// @route   PUT /api/projects/:id/members/:userId/role
exports.updateMemberRole = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only owner can change roles
        if (project.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only project owner can change member roles' });
        }

        const { role } = req.body;
        if (!['viewer', 'member', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be viewer, member, or admin' });
        }

        const memberIndex = project.members.findIndex(
            m => m.user.toString() === req.params.userId
        );

        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Member not found in project' });
        }

        project.members[memberIndex].role = role;
        await project.save();

        const updatedProject = await Project.findById(req.params.id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        res.json({ success: true, data: updatedProject });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get project invite link
// @route   GET /api/projects/:id/invite
exports.getInviteLink = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only owner and admins can get invite link
        const isOwner = project.owner.toString() === req.user.id;
        const isAdmin = project.members.some(m =>
            m.user.toString() === req.user.id && m.role === 'admin'
        );

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to get invite link' });
        }

        res.json({
            success: true,
            data: {
                inviteCode: project.inviteCode,
                inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${project.inviteCode}`
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Regenerate project invite code
// @route   POST /api/projects/:id/invite/regenerate
exports.regenerateInviteCode = async (req, res) => {
    try {
        const crypto = require('crypto');
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can regenerate invite code' });
        }

        project.inviteCode = crypto.randomBytes(6).toString('hex');
        await project.save();

        res.json({
            success: true,
            data: {
                inviteCode: project.inviteCode,
                inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${project.inviteCode}`
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get project by invite code (public info)
// @route   GET /api/projects/invite/:inviteCode
exports.getProjectByInvite = async (req, res) => {
    try {
        const project = await Project.findOne({ inviteCode: req.params.inviteCode })
            .select('name description color owner members')
            .populate('owner', 'name avatar');

        if (!project) {
            return res.status(404).json({ message: 'Invalid invite link' });
        }

        res.json({
            success: true,
            data: {
                _id: project._id,
                name: project.name,
                description: project.description,
                color: project.color,
                ownerName: project.owner.name,
                memberCount: project.members.length + 1
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Join project via invite code
// @route   POST /api/projects/join/:inviteCode
exports.joinProject = async (req, res) => {
    try {
        const project = await Project.findOne({ inviteCode: req.params.inviteCode });

        if (!project) {
            return res.status(404).json({ message: 'Invalid invite link' });
        }

        // Check if already a member or owner
        if (project.owner.toString() === req.user.id) {
            return res.status(400).json({ message: 'You are the owner of this project' });
        }

        const isMember = project.members.some(m => m.user.toString() === req.user.id);
        if (isMember) {
            return res.status(400).json({ message: 'You are already a member of this project' });
        }

        // Add user as member
        project.members.push({ user: req.user.id, role: 'member' });
        await project.save();

        const updatedProject = await Project.findById(project._id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        res.json({ success: true, data: updatedProject });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get current user's role in a project
// @route   GET /api/projects/:id/role
exports.getUserProjectRole = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // System admin
        if (req.user.role === 'admin') {
            return res.json({ success: true, data: { role: 'admin', isOwner: project.owner.toString() === req.user.id } });
        }

        // Project owner
        if (project.owner.toString() === req.user.id) {
            return res.json({ success: true, data: { role: 'owner', isOwner: true } });
        }

        // Check membership
        const membership = project.members.find(
            m => m.user.toString() === req.user.id
        );

        if (!membership) {
            return res.status(403).json({ message: 'You are not a member of this project' });
        }

        res.json({ success: true, data: { role: membership.role, isOwner: false } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
