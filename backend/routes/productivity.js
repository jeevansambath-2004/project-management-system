const express = require('express');
const router = express.Router();
const { getLeaderboard, getUserActivity } = require('../controllers/productivityController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/leaderboard').get(getLeaderboard);
router.route('/activity').get(getUserActivity);

module.exports = router;
