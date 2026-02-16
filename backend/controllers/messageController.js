const { Message, Conversation } = require('../models/Message');
const Project = require('../models/Project');

// @desc    Get all conversations
// @route   GET /api/messages/conversations
exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.id
        })
            .populate('participants', 'name email avatar')
            .populate('lastMessage')
            .populate({
                path: 'project',
                select: 'name color'
            })
            .sort('-updatedAt');

        res.json({ success: true, data: conversations });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get messages in conversation
// @route   GET /api/messages/:conversationId
exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({ conversation: req.params.conversationId })
            .populate('sender', 'name email avatar')
            .sort('createdAt');

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Send message
// @route   POST /api/messages/:conversationId
exports.sendMessage = async (req, res) => {
    try {
        const { content } = req.body;

        const message = await Message.create({
            content,
            sender: req.user.id,
            conversation: req.params.conversationId,
            readBy: [req.user.id]
        });

        // Update conversation
        await Conversation.findByIdAndUpdate(req.params.conversationId, {
            lastMessage: message._id,
            updatedAt: new Date()
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name email avatar');

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Start new conversation
// @route   POST /api/messages/new
exports.startConversation = async (req, res) => {
    try {
        const { recipientId, content } = req.body;

        // Check if conversation exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user.id, recipientId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [req.user.id, recipientId]
            });
        }

        // Create message
        const message = await Message.create({
            content,
            sender: req.user.id,
            conversation: conversation._id,
            readBy: [req.user.id]
        });

        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        const populatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'name email avatar')
            .populate('lastMessage');

        res.status(201).json({ success: true, data: populatedConversation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get or create project conversation
// @route   POST /api/messages/project/:projectId
exports.getOrCreateProjectConversation = async (req, res) => {
    try {
        const Project = require('../models/Project');
        const project = await Project.findById(req.params.projectId)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is part of the project
        const isOwner = project.owner._id.toString() === req.user.id;
        const isMember = project.members.some(m => m.user._id.toString() === req.user.id);

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to access this project chat' });
        }

        // Get all participants (owner + members)
        const participants = [project.owner._id];
        project.members.forEach(m => {
            if (!participants.some(p => p.toString() === m.user._id.toString())) {
                participants.push(m.user._id);
            }
        });

        // Check if project conversation exists
        let conversation = await Conversation.findOne({ project: project._id });

        if (!conversation) {
            conversation = await Conversation.create({
                participants,
                project: project._id
            });
        } else {
            // Update participants if needed
            conversation.participants = participants;
            await conversation.save();
        }

        const populatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'name email avatar')
            .populate('lastMessage')
            .populate({
                path: 'project',
                select: 'name color'
            });

        res.json({ success: true, data: populatedConversation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Mark messages as read
// @route   PATCH /api/messages/:conversationId/read
exports.markAsRead = async (req, res) => {
    try {
        await Message.updateMany(
            {
                conversation: req.params.conversationId,
                readBy: { $ne: req.user.id }
            },
            { $push: { readBy: req.user.id } }
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete message
// @route   DELETE /api/messages/:messageId
exports.deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await message.deleteOne();
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
