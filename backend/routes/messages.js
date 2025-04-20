const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/messages/:userId
// @desc    Get conversation history with a specific user
// @access  Private
router.get('/:userId', auth, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.id;

        // Validate if other user exists
        const otherUser = await User.findById(otherUserId);
        if (!otherUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get messages between the two users (in both directions)
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        // Mark messages as read if current user is the receiver
        await Message.updateMany(
            { sender: otherUserId, receiver: currentUserId, isRead: false },
            { isRead: true }
        );

        return res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/messages
// @desc    Send a message to another user
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { receiverId, content, relatedJobId } = req.body;
        
        if (!content || !receiverId) {
            return res.status(400).json({ message: 'Receiver and content are required' });
        }

        // Validate if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: 'Receiver not found' });
        }

        // Create and save new message
        const newMessage = new Message({
            sender: req.user.id,
            receiver: receiverId,
            content,
            relatedJob: relatedJobId || null,
            isRead: false
        });

        const message = await newMessage.save();
        
        return res.status(201).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/messages/conversations
// @desc    Get all conversations for the current user
// @access  Private
router.get('/conversations/list', auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Find all users the current user has messaged with
        const sentMessages = await Message.find({ sender: currentUserId })
            .distinct('receiver');
        
        const receivedMessages = await Message.find({ receiver: currentUserId })
            .distinct('sender');
        
        // Combine unique user IDs
        const conversationUserIds = [...new Set([...sentMessages, ...receivedMessages])];
        
        // Get the latest message from each conversation
        const conversations = await Promise.all(
            conversationUserIds.map(async (userId) => {
                const latestMessage = await Message.findOne({
                    $or: [
                        { sender: currentUserId, receiver: userId },
                        { sender: userId, receiver: currentUserId }
                    ]
                }).sort({ createdAt: -1 });

                const unreadCount = await Message.countDocuments({
                    sender: userId,
                    receiver: currentUserId,
                    isRead: false
                });

                const user = await User.findById(userId).select('name type companyName');

                return {
                    user,
                    latestMessage,
                    unreadCount
                };
            })
        );
        
        return res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 