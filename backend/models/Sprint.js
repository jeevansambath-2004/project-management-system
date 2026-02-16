const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a sprint name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    goal: {
        type: String,
        maxlength: [500, 'Goal cannot be more than 500 characters']
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['planning', 'active', 'completed'],
        default: 'planning'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one active sprint per project
sprintSchema.pre('save', async function (next) {
    if (this.status === 'active') {
        await mongoose.model('Sprint').updateMany(
            { project: this.project, status: 'active', _id: { $ne: this._id } },
            { status: 'planning' }
        );
    }
    next();
});

module.exports = mongoose.model('Sprint', sprintSchema);
