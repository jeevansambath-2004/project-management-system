const express = require('express');
const router = express.Router();
const {
    getTasks,
    getTasksByProject,
    getTask,
    createTask,
    updateTask,
    updateTaskStatus,
    assignTask,
    deleteTask,
    reorderTasks,
    getBacklogTasks,
    getTasksBySprint,
    assignToSprint,
    getTeamProgress,
    requestStageChange,
    approveStageChange,
    rejectStageChange,
    getPendingApprovals
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(getTasks)
    .post(createTask);

router.patch('/reorder', reorderTasks);
router.get('/project/:projectId', getTasksByProject);
router.get('/backlog/:projectId', getBacklogTasks);
router.get('/sprint/:sprintId', getTasksBySprint);
router.get('/team-progress/:projectId', getTeamProgress);
router.get('/pending-approvals/:projectId', getPendingApprovals);

router.route('/:id')
    .get(getTask)
    .put(updateTask)
    .delete(deleteTask);

router.patch('/:id/status', updateTaskStatus);
router.patch('/:id/assign', assignTask);
router.patch('/:id/sprint', assignToSprint);
router.patch('/:id/request-stage-change', requestStageChange);
router.patch('/:id/approve-stage', approveStageChange);
router.patch('/:id/reject-stage', rejectStageChange);

module.exports = router;
