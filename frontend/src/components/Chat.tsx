import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageService, userService } from '../services/api';
import {
    Container,
    Paper,
    Typography,
    TextField,
    List,
    ListItem,
    Divider,
    CircularProgress,
    IconButton,
    Box,
    InputAdornment,
    useTheme
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import io from 'socket.io-client';

interface Message {
    _id: string;
    sender: string;
    receiver: string;
    content: string;
    relatedJob?: string;
    isRead: boolean;
    createdAt: string;
}

interface ConversationUser {
    _id: string;
    name: string;
    type: 'jobseeker' | 'employer';
    companyName?: string;
}

const Chat: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<ConversationUser | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const socketCleanupRef = React.useRef<() => void>(() => {});
    const theme = useTheme();
    console.log(`[Chat] Component rendered for conversation with ${userId}.`);

    // Function to scroll to the bottom of the message list
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Fetch messages when component mounts or userId changes
    useEffect((): (() => void) => {
        let isMounted = true;
        // Connect to the base URL, not /api
        const socketIoUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        console.log('[Chat] Attempting to connect socket to:', socketIoUrl);
        const socket = io(socketIoUrl, { path: '/socket.io/'});

        // --- WebSocket Logic: Join Room using CURRENT user's ID ---
        if (user?.id) {
            const roomName = `user_${user.id}`;
            console.log(`[Chat] Emitting 'joinChat' to join room: ${roomName}`);
            socket.emit('joinChat', roomName);
        } else {
            console.warn('[Chat] Cannot join chat room: Current user ID is missing.');
        }
        // --- End WebSocket Join Room ---

        // Define handlers
        const receiveMessageHandler = (message: Message) => {
            if (isMounted) {
                console.log('[Chat] Received message via socket:', message);
                setMessages((prevMessages) => [...prevMessages, message]);
                scrollToBottom();
            }
        };

        const connectErrorHandler = (err: Error) => {
            console.error('[Chat] Socket connection error:', err);
            if (isMounted) {
                setError('Connection error, please try again later.');
            }
        };

        socketCleanupRef.current = () => {
            console.log('[Chat] Explicit socket cleanup called.');
            socket.off('receiveMessage', receiveMessageHandler); 
            socket.off('connect_error', connectErrorHandler);
            socket.disconnect();
        };

        const fetchMessages = async () => {
            if (!userId) {
                console.log('[Chat] fetchMessages aborted: No userId.');
                return;
            }
            
            try {
                console.log(`[Chat] Fetching messages for conversation with ${userId}...`);
                setLoading(true);
                const messagesResponse = await messageService.getMessages(userId);
                console.log(`[Chat] Fetched messages data for ${userId}:`, messagesResponse);
                setMessages(messagesResponse);
                
                // Get user details if not already loaded
                if (!otherUser || otherUser._id !== userId) {
                    console.log(`[Chat] Fetching other user details for ID: ${userId}`);
                    const userResponse = await userService.getUserById(userId);
                    console.log(`[Chat] Fetched other user details:`, userResponse);
                    setOtherUser(userResponse);
                }
                
                setError(null);
            } catch (err) {
                console.error('Error fetching messages:', err);
                setError('Failed to load messages. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
        
        // --- WebSocket Logic --- 
        console.log('[Chat] Setting up socket listeners...');
        
        // Listen for new messages
        const handleNewMessage = (newMessage: Message) => {
            console.log('[Chat] Received newMessage via socket:', newMessage);
            // Check if the message involves the current user and the other user in this chat
            const currentUserId = user?.id;
            const otherUserId = userId; 
            console.log(`[Chat] Listener check: currentUserId=${currentUserId}, otherUserId=${otherUserId}, msgSender=${newMessage.sender}, msgReceiver=${newMessage.receiver}`);

            // *** Add check: Only add message if the sender is the OTHER user ***
            // The sender's own messages are handled optimistically in handleSendMessage
            if (currentUserId && otherUserId && 
                newMessage.sender === otherUserId && // Sender must be the other user
                newMessage.receiver === currentUserId) // Receiver must be the current user
            {
                console.log('[Chat] Conditions met. Adding received message from other user to state:', newMessage);
                setMessages((prevMessages) => {
                    // Avoid adding duplicate messages if somehow already present
                    if (prevMessages.some(msg => msg._id === newMessage._id)) {
                        console.log('[Chat] State Update: Received message already exists in state, skipping.');
                        return prevMessages;
                    }
                    console.log('[Chat] State Update: Adding message to state.');
                    return [...prevMessages, newMessage];
                });
                // Ensure scrolling happens *after* state update attempt
                // Using setTimeout to push to end of event loop might help ensure DOM is updated
                setTimeout(() => scrollToBottom(), 0);
            } else {
                // Log exactly why it's ignored
                if (newMessage.sender === currentUserId) {
                    console.log('[Chat] Ignored: Message is from the current user (handled optimistically).');
                } else if (!currentUserId || !otherUserId) {
                     console.log('[Chat] Ignored: User IDs missing in listener execution.');
                } else if (newMessage.sender !== otherUserId) {
                    console.log(`[Chat] Ignored: Message sender (${newMessage.sender}) is not the expected other user (${otherUserId}).`);
                } else if (newMessage.receiver !== currentUserId) {
                    console.log(`[Chat] Ignored: Message receiver (${newMessage.receiver}) is not the current user (${currentUserId}).`);
                } else {
                     console.log('[Chat] Ignored: Reason unclear / Does not belong to this conversation.');
                }
            }
        };
        socket.on('newMessage', handleNewMessage);
        
        // Handle connection/disconnection events for debugging
        socket.on('connect', () => console.log('[Chat] Socket connected:', socket.id));
        socket.on('disconnect', (reason: string) => console.log('[Chat] Socket disconnected:', reason));
        socket.on('connect_error', (err: Error) => console.error('[Chat] Socket connection error:', err));
        // --- End WebSocket Logic ---
        
        // Cleanup function
        const cleanup = () => {
            isMounted = false;
            console.log('[Chat] Cleaning up: Disconnecting socket and removing listeners...');
            socket.off('newMessage', handleNewMessage);
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error', connectErrorHandler);
            socket.disconnect();
        };

        return cleanup; 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, user?.id]); // Added user.id as dependency for joining room

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[Chat] handleSendMessage triggered.');
        console.log('[Chat] Current auth user state:', user);

        // Ensure user and otherUser data is loaded before proceeding
        if (!user || !user.id) {
            console.error('[Chat] Cannot send message: Current user data is missing.');
            setError('Authentication error. Please refresh and try again.');
            return;
        }
        if (!otherUser || !otherUser._id) {
            console.error('[Chat] Cannot send message: Recipient user data is missing.');
            setError('Recipient information is missing. Please refresh.');
            return;
        }
        if (!newMessage.trim()) {
            console.warn('[Chat] Cannot send empty message.');
            return; // Don't send empty messages
        }

        // Construct message data ONLY if checks pass
        const currentUserId = user.id;
        const recipientUserId = otherUser._id;
        const messageContent = newMessage.trim();

        // Prepare a temporary message for immediate display
        const tempMessageId = `temp-${Date.now()}`;
        const locallyAddedMessage: Message = {
            _id: tempMessageId,
            sender: currentUserId,
            receiver: recipientUserId,
            content: messageContent,
            isRead: true, // Assume sender reads their own message
            createdAt: new Date().toISOString(),
        };

        // Add the message locally immediately for responsiveness
        setMessages(prev => [...prev, locallyAddedMessage]);
        setNewMessage(''); // Clear input field immediately
        scrollToBottom(); // Scroll after adding locally

        const messageData = {
            sender: currentUserId, // Now we know this exists
            receiverId: recipientUserId, // Now we know this exists
            content: messageContent, 
            // conversationId: userId // This isn't needed by backend POST
        };

        try {
            setError(null); // Clear previous errors
            console.log('[Chat] Calling messageService.sendMessage with data:', messageData);
            const savedMessage = await messageService.sendMessage(messageData);
            console.log('[Chat] Message saved via API:', savedMessage);

            // Replace the temporary message with the one saved by the backend
            setMessages(prev => prev.map(msg => 
                msg._id === tempMessageId ? { ...savedMessage, sender: currentUserId, receiver: recipientUserId } : msg
            ));

            // NOTE: No need to emit socket event from frontend anymore.
            // The backend handles emission after successful save.

        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message. Please try again.');
            // Optional: Remove the temporary message if sending failed
            setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleBack = () => {
        navigate('/messages');
    };

    if (loading && messages.length === 0) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Loading conversation...
                </Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={handleBack} edge="start" color="inherit" aria-label="back">
                        <ArrowBackIcon />
                    </IconButton>
                    
                    <Typography variant="h5" component="div" sx={{ flexGrow: 1, ml: 2 }}>
                        {otherUser ? (
                            <>
                                {otherUser.name}
                                {otherUser.type === 'employer' && otherUser.companyName && (
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {otherUser.companyName}
                                    </Typography>
                                )}
                            </>
                        ) : (
                            'Chat'
                        )}
                    </Typography>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        height: '400px', 
                        overflow: 'auto',
                        p: 2,
                        backgroundColor: '#f5f5f5'
                    }}
                >
                    {messages.length === 0 ? (
                        <Typography align="center" color="text.secondary" sx={{ mt: 10 }}>
                            No messages yet. Start the conversation!
                        </Typography>
                    ) : (
                        <List>
                            {messages.map((message) => (
                                <ListItem 
                                    key={message._id}
                                    sx={{ 
                                        justifyContent: message.sender === user?.id ? 'flex-end' : 'flex-start',
                                        mb: 1,
                                        px: 0
                                    }}
                                >
                                    <Box 
                                        sx={{
                                            backgroundColor: message.sender === user?.id ? theme.palette.primary.main : theme.palette.grey[300],
                                            color: message.sender === user?.id ? theme.palette.primary.contrastText : theme.palette.text.primary,
                                            p: 1.5,
                                            borderRadius: '16px',
                                            maxWidth: '75%',
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        <Typography variant="body1">
                                            {message.content}
                                        </Typography>
                                        <Typography 
                                            variant="caption" 
                                            display="block" 
                                            sx={{ 
                                                mt: 0.5, 
                                                opacity: 0.7,
                                                textAlign: message.sender === user?.id ? 'right' : 'left' 
                                            }}
                                        >
                                            {formatTimestamp(message.createdAt)}
                                        </Typography>
                                    </Box>
                                </ListItem>
                            ))}
                            <div ref={messagesEndRef} />
                        </List>
                    )}
                </Paper>
                
                <Box component="form" onSubmit={handleSendMessage} sx={{ mt: 2, display: 'flex' }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        InputProps={{
                            sx: { borderRadius: '24px' },
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton type="submit" edge="end" color="primary" aria-label="send" disabled={!newMessage.trim()}>
                                        <SendIcon />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>
            </Paper>
        </Container>
    );
};

export default Chat; 