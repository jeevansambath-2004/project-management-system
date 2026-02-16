const express = require('express');
const router = express.Router();
const {
    getSprintsByProject,
    getActiveSprint,
    getSprint,
    createSprint,
    updateSprint,
    startSprint,
    completeSprint,
    deleteSprint
} = require('../controllers/sprintController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .post(createSprint);

router.get('/project/:projectId', getSprintsByProject);
router.get('/project/:projectId/active', getActiveSprint);

router.route('/:id')
    .get(getSprint)
    .put(updateSprint)
    .delete(deleteSprint);

router.patch('/:id/start', startSprint);
router.patch('/:id/complete', completeSprint);

module.exports = router;
