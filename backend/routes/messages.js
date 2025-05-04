const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose'); // Import mongoose

// @route   GET /api/messages/conversations/list
// @desc    Get all conversations for the current user
// @access  Private
// NOTE: Moved this route BEFORE the parameterized /:userId route to avoid conflict
router.get('/conversations/list', auth, async (req, res) => {
    console.log(`[Messages API GET /conversations/list] Request from user ${req.user.id}`);
    try {
        const currentUserId = new mongoose.Types.ObjectId(req.user.id);

        // Use Aggregation Pipeline for robust conversation fetching
        const conversationsData = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: currentUserId }, { receiver: currentUserId }]
                }
            },
            {
                $sort: { createdAt: -1 } // Sort by most recent message first
            },
            {
                $group: {
                    _id: { // Group by the *other* user involved in the conversation
                        $cond: [
                            { $eq: ["$sender", currentUserId] },
                            "$receiver",
                            "$sender"
                        ]
                    },
                    latestMessageDoc: { $first: "$$ROOT" }, // Get the whole document of the latest message
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { 
                                    $and: [
                                        { $eq: ["$receiver", currentUserId] }, // Message was sent TO the current user
                                        { $eq: ["$isRead", false] } // And it's unread
                                    ]
                                },
                                1, // Add 1 to sum if unread
                                0  // Add 0 otherwise
                            ]
                        }
                    }
                }
            },
            {
                $lookup: { // Join with the Users collection to get the other user's details
                    from: "users",
                    localField: "_id", // The grouped _id is the other user's ID
                    foreignField: "_id",
                    as: "userData"
                }
            },
            {
                $unwind: "$userData" // Deconstruct the userData array
            },
            {
                $project: { // Shape the final output
                    _id: 0, // Exclude the default aggregation _id
                    user: {
                        _id: "$userData._id",
                        name: "$userData.name",
                        type: "$userData.type",
                        companyName: "$userData.companyName"
                    },
                    latestMessage: {
                        _id: "$latestMessageDoc._id",
                        sender: "$latestMessageDoc.sender",
                        receiver: "$latestMessageDoc.receiver",
                        content: "$latestMessageDoc.content",
                        relatedJob: "$latestMessageDoc.relatedJob",
                        isRead: "$latestMessageDoc.isRead",
                        createdAt: "$latestMessageDoc.createdAt"
                    },
                    unreadCount: 1 // Include the calculated unread count
                }
            },
            {
                $sort: { "latestMessage.createdAt": -1 } // Sort the final list by latest message time
            }
        ]);

        console.log(`[Messages API GET /conversations/list] Found ${conversationsData.length} conversations for user ${req.user.id} via aggregation`);
        return res.json(conversationsData);
    } catch (error) {
        console.error(`[Messages API GET /conversations/list] Error:`, error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/messages/:userId
// @desc    Get conversation history with a specific user
// @access  Private
router.get('/:userId', auth, async (req, res) => {
    console.log(`[Messages API GET /${req.params.userId}] Request from user ${req.user.id}`);
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.id;

        // Validate if other user exists
        // const otherUser = await User.findById(otherUserId); // This validation might be redundant if the frontend already has user info
        // if (!otherUser) {
        //     return res.status(404).json({ message: 'User not found' });
        // }

        // Get messages between the two users (in both directions)
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        // Mark messages as read if current user is the receiver
        const updateResult = await Message.updateMany(
            { sender: otherUserId, receiver: currentUserId, isRead: false },
            { isRead: true }
        );
        console.log(`[Messages API GET /${otherUserId}] Found ${messages.length} messages. Marked ${updateResult.modifiedCount} as read.`);

        return res.json(messages);
    } catch (error) {
        console.error(`[Messages API GET /${req.params.userId}] Error:`, error);
        // Handle CastError for invalid ObjectId
        if (error.name === 'CastError') {
             console.log(`[Messages API GET /${req.params.userId}] Invalid ID format.`);
             return res.status(400).json({ message: 'Invalid user ID format' });
        }
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/messages
// @desc    Send a message to another user
// @access  Private
router.post('/', auth, async (req, res) => {
    console.log(`[Messages API POST /] Request from user ${req.user.id} to ${req.body.receiverId}`);
    try {
        const { receiverId, content, relatedJobId } = req.body;
        console.log(`[Messages API POST /] Request body:`, { receiverId, content: content ? 'Present' : 'Missing', relatedJobId }); // Log body without full content
        
        if (!content || !receiverId) {
            console.log(`[Messages API POST /] Validation failed: Missing receiver or content.`);
            return res.status(400).json({ message: 'Receiver and content are required' });
        }

        // Validate if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
             console.log(`[Messages API POST /] Receiver not found: ${receiverId}`);
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
        console.log(`[Messages API POST /] Message saved successfully. ID: ${message._id}`);
        
        // --- Emit WebSocket event --- 
        const io = req.app.get('io'); // Get the io instance from app
        if (io) {
            // Emit to the receiver's room
            const receiverRoom = `user_${receiverId}`;
            console.log(`[Messages API POST /] Emitting 'newMessage' to room: ${receiverRoom}`);
            io.to(receiverRoom).emit('newMessage', message);

            // Emit to the sender's room (so sender sees the message instantly too)
            const senderRoom = `user_${req.user.id}`;
             if (senderRoom !== receiverRoom) { // Don't emit twice if sender is messaging themselves
                console.log(`[Messages API POST /] Emitting 'newMessage' to room: ${senderRoom}`);
                io.to(senderRoom).emit('newMessage', message);
            }
        } else {
            console.error('[Messages API POST /] Socket.IO instance not found on app object!');
        }
        
        return res.status(201).json(message);
    } catch (error) {
        console.error(`[Messages API POST /] Error:`, error);
        // Handle CastError for invalid ObjectId
        if (error.name === 'CastError') {
             console.log(`[Messages API POST /] Invalid receiver ID format: ${req.body.receiverId}`);
             return res.status(400).json({ message: 'Invalid receiver ID format' });
        }
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 