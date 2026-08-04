const express = require('express');
const router = express.Router();
const {
    getConversations,
    getMessages,
    sendMessage,
    startConversation,
    getOrCreateProjectConversation,
    markAsRead,
    deleteMessage,
    votePoll,
    toggleReaction
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/conversations', getConversations);
router.post('/new', startConversation);
router.post('/project/:projectId', getOrCreateProjectConversation);

router.route('/:conversationId')
    .get(getMessages)
    .post(sendMessage);

router.post('/:messageId/vote', votePoll);
router.post('/:messageId/react', toggleReaction);
router.patch('/:conversationId/read', markAsRead);
router.delete('/:messageId', deleteMessage);

module.exports = router;
