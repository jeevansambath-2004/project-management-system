const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        next();
    } catch (err) {
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// Middleware to check if user is owner or admin of a specific project
// Looks for projectId in req.params.id, req.params.projectId, or req.body.project
const Project = require('../models/Project');

exports.authorizeProjectRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const projectId = req.params.id || req.params.projectId || req.body.project;

            if (!projectId) {
                return res.status(400).json({ message: 'Project ID is required' });
            }

            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            // System admin can always access
            if (req.user.role === 'admin') {
                req.projectRole = 'admin';
                req.project = project;
                return next();
            }

            // Check if user is the project owner
            const isOwner = project.owner.toString() === req.user.id;
            if (isOwner) {
                req.projectRole = 'owner';
                req.project = project;
                return next();
            }

            // Check user's role in the project members
            const membership = project.members.find(
                m => m.user.toString() === req.user.id
            );

            if (!membership) {
                return res.status(403).json({ message: 'You are not a member of this project' });
            }

            if (!allowedRoles.includes(membership.role)) {
                return res.status(403).json({
                    message: `Your project role '${membership.role}' does not have permission for this action. Required: ${allowedRoles.join(', ')}`
                });
            }

            req.projectRole = membership.role;
            req.project = project;
            next();
        } catch (err) {
            return res.status(500).json({ message: 'Authorization error', error: err.message });
        }
    };
};
