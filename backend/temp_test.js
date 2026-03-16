const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const Task = require('./models/Task');
        const r1 = await Task.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$storyPoints', 0] } } } }]);
        console.log('Result:', r1);
    } catch (err) {
        console.error('MongoErr:', err.message);
    }
    process.exit(0);
});
