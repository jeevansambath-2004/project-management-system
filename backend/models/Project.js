const mongoose = require('mongoose');
const crypto = require('crypto');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a project name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    inviteCode: {
        type: String,
        unique: true,
        sparse: true // Allows null values and only enforces uniqueness on non-null values
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    status: {
        type: String,
        enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
        default: 'planning'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['viewer', 'member', 'admin'],
            default: 'member'
        }
    }],
    color: {
        type: String,
        default: '#6366f1'
    },
    boardType: {
        type: String,
        enum: ['kanban', 'scrum'],
        default: 'kanban'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique invite code before saving
projectSchema.pre('save', async function (next) {
    if (!this.inviteCode) {
        // Generate a unique invite code
        let code;
        let isUnique = false;

        while (!isUnique) {
            code = crypto.randomBytes(6).toString('hex');
            const existing = await mongoose.model('Project').findOne({ inviteCode: code });
            if (!existing) {
                isUnique = true;
            }
        }

        this.inviteCode = code;
    }
    next();
});

module.exports = mongoose.model('Project', projectSchema);

