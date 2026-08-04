const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a task title'],
        trim: true,
        maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'done'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    tags: [{
        type: String
    }],
    // Scrum specific fields
    storyPoints: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    sprint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sprint'
    },
    position: {
        type: Number,
        default: 0
    },
    // Stage approval workflow fields
    approvalStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    },
    requestedStatus: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'done', null],
        default: null
    },
    previousStatus: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'done', null],
        default: null
    },
    approvalRequestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalRequestedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', taskSchema);
