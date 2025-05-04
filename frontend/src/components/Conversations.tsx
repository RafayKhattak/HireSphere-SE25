import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageService, userService } from '../services/api';
import io from 'socket.io-client';
import {
    Container,
    Typography,
    Paper,
    List,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    Avatar,
    Divider,
    CircularProgress,
    Badge,
    Box,
    Alert
} from '@mui/material';
import { format } from 'date-fns';
import MessageIcon from '@mui/icons-material/Message';
import BusinessIcon from '@mui/icons-material/Business';

interface Message {
    _id: string;
    sender: string;
    receiver: string;
    content: string;
    relatedJob?: string;
    isRead: boolean;
    createdAt: string;
}

interface Conversation {
    user: {
        _id: string;
        name: string;
        type: 'jobseeker' | 'employer';
        companyName?: string;
    };
    latestMessage: {
        content: string;
        createdAt: string;
    };
    unreadCount: number;
}

const Conversations: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    console.log('[Conversations] Component rendered.');

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            console.log('[Conversations] Fetching conversations...');
            const response = await messageService.getConversations();
            console.log('[Conversations] Fetched conversations data:', response);
            const sortedResponse = response.sort((a: Conversation, b: Conversation) => 
                new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime()
            );
            setConversations(sortedResponse);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching conversations:', err);
            setError(err.response?.data?.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchConversations();
        }

        if (!user?.id) {
            console.log('[Conversations] No user ID, skipping WebSocket setup.');
            return;
        }

        const socketIoUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        console.log('[Conversations] Attempting to connect socket to:', socketIoUrl);
        const socket = io(socketIoUrl, { path: '/socket.io/' });

        const roomName = `user_${user.id}`;
        console.log(`[Conversations] Emitting 'joinChat' to join room: ${roomName}`);
        socket.emit('joinChat', roomName);

        const handleNewMessage = (newMessage: Message) => {
            console.log('[Conversations] Received newMessage via socket:', newMessage);
            
            setConversations(prevConversations => {
                if (!user?.id) return prevConversations; 
        
                const otherUserId = newMessage.sender === user.id ? newMessage.receiver : newMessage.sender;
                const isIncoming = newMessage.receiver === user.id;
        
                // Check if conversation exists in CURRENT state
                const existingIndex = prevConversations.findIndex(c => c.user._id === otherUserId);
                
                // If exists, update existing
                if (existingIndex > -1) {
                    console.log(`[Conversations] Updating existing conversation for ${otherUserId}`);
                    return prevConversations.map(convo => 
                        convo.user._id === otherUserId ? {
                            ...convo,
                            latestMessage: {
                                content: newMessage.content,
                                createdAt: newMessage.createdAt
                            },
                            unreadCount: isIncoming ? convo.unreadCount + 1 : convo.unreadCount
                        } : convo
                    ).sort(sortConversations);
                }
        
                // Add TEMPORARY entry first if it doesn't exist
                console.log(`[Conversations] New message from a new conversation (${otherUserId}). Adding temporary entry.`);
                const tempConvo: Conversation = {
                    user: {
                        _id: otherUserId,
                        name: 'Loading...', // Temporary name
                        type: 'jobseeker' // Default type, will be updated
                    },
                    latestMessage: {
                        content: newMessage.content,
                        createdAt: newMessage.createdAt
                    },
                    unreadCount: isIncoming ? 1 : 0
                };
        
                // Return immediately with temp entry added
                const updatedWithTemp = [...prevConversations, tempConvo].sort(sortConversations);
        
                // Then fetch user details async and replace temp entry
                userService.getUserById(otherUserId).then(otherUserDetails => {
                    console.log(`[Conversations] User details fetched for ${otherUserId}. Updating temporary entry.`);
                    setConversations(currentConvos => 
                        currentConvos.map(convo => 
                            convo.user._id === otherUserId ? {
                                ...convo, // Keep latestMessage & unreadCount from tempConvo
                                user: { // Update user details
                                    _id: otherUserDetails._id,
                                    name: otherUserDetails.name,
                                    type: otherUserDetails.type,
                                    companyName: otherUserDetails.companyName
                                }
                            } : convo
                        ).sort(sortConversations)
                    );
                }).catch(err => {
                    console.error(`[Conversations] Failed to fetch user details for ${otherUserId}:`, err);
                    // Optionally remove the temp entry or show an error state
                     setConversations(currentConvos => 
                         currentConvos.filter(convo => convo.user._id !== otherUserId).sort(sortConversations)
                     );
                });
        
                return updatedWithTemp; // Return state with temporary entry
            });
        };

        socket.on('newMessage', handleNewMessage);
        socket.on('connect', () => console.log('[Conversations] Socket connected:', socket.id));
        socket.on('disconnect', (reason: string) => console.log('[Conversations] Socket disconnected:', reason));
        socket.on('connect_error', (err: Error) => console.error('[Conversations] Socket connection error:', err));

        return () => {
            console.log('[Conversations] Cleaning up: Disconnecting socket and removing listeners...');
            socket.off('newMessage', handleNewMessage);
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.disconnect();
        };
    }, [user, fetchConversations]);

    const handleConversationClick = (userId: string) => {
        console.log(`[Conversations] Navigating to chat with user ID: ${userId}`);
        navigate(`/messages/${userId}`);
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return format(date, 'h:mm a');
        }
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (date > weekAgo) {
            return format(date, 'EEEE');
        }
        
        return format(date, 'MMM d');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Add this helper function
    const sortConversations = (a: Conversation, b: Conversation) => 
        new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime();

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Loading conversations...
                </Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Messages
                </Typography>
                
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                
                {conversations.length === 0 ? (
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 4
                    }}>
                        <MessageIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No messages yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            When you start a conversation with employers or job seekers, you'll see it here.
                        </Typography>
                    </Box>
                ) : (
                    <List>
                        {conversations.map((conversation, index) => (
                            <React.Fragment key={conversation.user._id}>
                                <ListItemButton
                                    onClick={() => handleConversationClick(conversation.user._id)}
                                    alignItems="flex-start"
                                    sx={{ py: 2 }}
                                >
                                    <ListItemAvatar>
                                        <Badge 
                                            color="primary" 
                                            badgeContent={conversation.unreadCount} 
                                            invisible={conversation.unreadCount === 0}
                                        >
                                            <Avatar 
                                                sx={{ 
                                                    bgcolor: conversation.user.type === 'employer' ? 'secondary.main' : 'primary.main'
                                                }}
                                            >
                                                {conversation.user.type === 'employer' ? 
                                                    <BusinessIcon /> : 
                                                    getInitials(conversation.user.name)
                                                }
                                            </Avatar>
                                        </Badge>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography 
                                                component="span" 
                                                variant="subtitle1"
                                                fontWeight={conversation.unreadCount > 0 ? 'bold' : 'normal'}
                                            >
                                                {conversation.user.name}
                                                {conversation.user.type === 'employer' && conversation.user.companyName && (
                                                    <Typography 
                                                        component="span" 
                                                        variant="body2" 
                                                        color="text.secondary"
                                                        sx={{ ml: 1 }}
                                                    >
                                                        ({conversation.user.companyName})
                                                    </Typography>
                                                )}
                                            </Typography>
                                        }
                                        secondary={
                                            <React.Fragment>
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                    sx={{ 
                                                        display: 'inline',
                                                        fontWeight: conversation.unreadCount > 0 ? 'medium' : 'normal'
                                                    }}
                                                >
                                                    {conversation.latestMessage.content.length > 50 
                                                        ? conversation.latestMessage.content.substring(0, 50) + '...' 
                                                        : conversation.latestMessage.content
                                                    }
                                                </Typography>
                                            </React.Fragment>
                                        }
                                    />
                                    <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ ml: 2, alignSelf: 'flex-start', minWidth: '60px', textAlign: 'right' }}
                                    >
                                        {formatTimestamp(conversation.latestMessage.createdAt)}
                                    </Typography>
                                </ListItemButton>
                                {index < conversations.length - 1 && <Divider variant="inset" component="li" />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Paper>
        </Container>
    );
};

export default Conversations; 