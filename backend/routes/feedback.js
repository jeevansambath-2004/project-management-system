const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// @route   POST api/feedback
// @desc    Submit platform feedback
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, rating, message } = req.body;

        const newFeedback = new Feedback({
            name,
            email,
            rating,
            message
        });

        const savedFeedback = await newFeedback.save();
        res.json(savedFeedback);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/feedback
// @desc    Get all feedback
// @access  Public (or could be Admin only)
router.get('/', async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
