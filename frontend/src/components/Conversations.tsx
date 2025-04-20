import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Container,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    Avatar,
    Divider,
    CircularProgress,
    Badge,
    Box,
    IconButton
} from '@mui/material';
import { format } from 'date-fns';
import MessageIcon from '@mui/icons-material/Message';
import BusinessIcon from '@mui/icons-material/Business';

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

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                setLoading(true);
                const response = await api.get('/messages/conversations/list');
                setConversations(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching conversations:', err);
                setError('Failed to load conversations. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
        
        // Poll for new messages
        const interval = setInterval(fetchConversations, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const handleConversationClick = (userId: string) => {
        navigate(`/messages/${userId}`);
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        
        // If today, show time
        if (date.toDateString() === now.toDateString()) {
            return format(date, 'h:mm a');
        }
        
        // If within a week, show day name
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (date > weekAgo) {
            return format(date, 'EEEE');
        }
        
        // Otherwise show date
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
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
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