const express = require('express');
const router = express.Router();
const {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    addMember,
    removeMember,
    updateMemberRole,
    getInviteLink,
    regenerateInviteCode,
    getProjectByInvite,
    joinProject,
    getUserProjectRole
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

// Public route to get project info by invite code
router.get('/invite/:inviteCode', getProjectByInvite);

// Protected routes
router.use(protect);

router.route('/')
    .get(getProjects)
    .post(createProject);

router.route('/:id')
    .get(getProject)
    .put(updateProject)
    .delete(deleteProject);

// User role in project
router.get('/:id/role', getUserProjectRole);

router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);
router.put('/:id/members/:userId/role', updateMemberRole);

// Invite link routes
router.get('/:id/invite', getInviteLink);
router.post('/:id/invite/regenerate', regenerateInviteCode);
router.post('/join/:inviteCode', joinProject);

module.exports = router;
