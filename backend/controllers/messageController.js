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
            .populate('attachment')
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
        const { content, attachment, poll } = req.body;

        const message = await Message.create({
            content,
            attachment: attachment || null,
            poll: poll || null,
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
            .populate('sender', 'name email avatar')
            .populate('attachment');

        // Notify participants
        const conv = await Conversation.findById(req.params.conversationId);
        if (conv && req.app.get('io')) {
            const io = req.app.get('io');
            conv.participants.forEach(p => {
                if (p.toString() !== req.user.id) {
                    io.to(p.toString()).emit('notification', {
                        type: 'message',
                        title: 'New Message',
                        body: `You received a new message from ${populatedMessage.sender.name}`,
                        link: '/messages'
                    });
                }
            });
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Start new conversation
// @route   POST /api/messages/new
exports.startConversation = async (req, res) => {
    try {
        const { recipientId, content, attachment, poll } = req.body;

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
            attachment: attachment || null,
            poll: poll || null,
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

        // Notify recipient
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const sender = populatedConversation.participants.find(p => p._id.toString() === req.user.id);
            io.to(recipientId.toString()).emit('notification', {
                type: 'message',
                title: 'New Conversation',
                body: `${sender ? sender.name : 'Someone'} sent you a message`,
                link: '/messages'
            });
        }

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

// @desc    Vote in a message poll
// @route   POST /api/messages/:messageId/vote
exports.votePoll = async (req, res) => {
    try {
        const { optionId } = req.body;
        const message = await Message.findById(req.params.messageId);

        if (!message || !message.poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        const userId = req.user.id;

        // Find the index of the selected option
        const optionIndex = message.poll.options.findIndex(opt => opt._id.toString() === optionId);

        if (optionIndex === -1) {
            return res.status(404).json({ message: 'Poll option not found' });
        }

        // Toggle behavior: check if already voted for THIS option
        const alreadyVotedThisOption = message.poll.options[optionIndex].votes.some(
            v => v.toString() === userId
        );

        // Clear user's vote from all options in this poll
        message.poll.options.forEach(opt => {
            opt.votes = opt.votes.filter(v => v.toString() !== userId);
        });

        // If user wasn't voted in THIS option, add the vote (toggle on)
        if (!alreadyVotedThisOption) {
            message.poll.options[optionIndex].votes.push(userId);
        }

        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name email avatar')
            .populate('attachment');

        res.json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Toggle message reaction
// @route   POST /api/messages/:messageId/react
exports.toggleReaction = async (req, res) => {
    try {
        const { emoji } = req.body;
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const userId = req.user.id;

        // Find if this emoji reaction already exists
        let reaction = message.reactions.find(r => r.emoji === emoji);

        if (reaction) {
            // Check if user already reacted with this emoji
            const userIndex = reaction.users.indexOf(userId);

            if (userIndex !== -1) {
                // Remove reaction if already exists
                reaction.users.splice(userIndex, 1);
                // If no users left for this emoji, remove the emoji entirely
                if (reaction.users.length === 0) {
                    message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                }
            } else {
                // Add user to existing emoji reaction
                reaction.users.push(userId);
            }
        } else {
            // Add new emoji reaction
            message.reactions.push({
                emoji,
                users: [userId]
            });
        }

        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name email avatar')
            .populate('attachment');

        res.json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
