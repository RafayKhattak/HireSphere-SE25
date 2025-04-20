import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    Divider,
    Avatar,
    Grid,
    Box,
    CircularProgress,
    IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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

    // Fetch messages when component mounts or userId changes
    useEffect(() => {
        const fetchMessages = async () => {
            if (!userId) return;
            
            try {
                setLoading(true);
                const response = await api.get(`/messages/${userId}`);
                setMessages(response.data);
                
                // Get user details if not already loaded
                if (!otherUser) {
                    const userResponse = await api.get(`/auth/users/${userId}`);
                    setOtherUser(userResponse.data);
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
        
        // Set up polling for new messages every 10 seconds
        const interval = setInterval(fetchMessages, 10000);
        
        return () => clearInterval(interval);
    }, [userId, otherUser]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newMessage.trim() || !userId) return;
        
        try {
            const response = await api.post('/messages', {
                receiverId: userId,
                content: newMessage.trim()
            });
            
            setMessages([...messages, response.data]);
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message. Please try again.');
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
                                        textAlign: message.sender === user?.id ? 'right' : 'left',
                                        mb: 1
                                    }}
                                >
                                    <Grid container>
                                        <Grid item xs={12}>
                                            <Box 
                                                sx={{ 
                                                    display: 'inline-block',
                                                    backgroundColor: message.sender === user?.id ? '#1a237e' : '#e0e0e0',
                                                    color: message.sender === user?.id ? 'white' : 'black',
                                                    p: 2,
                                                    borderRadius: 2,
                                                    maxWidth: '70%'
                                                }}
                                            >
                                                <Typography variant="body1">
                                                    {message.content}
                                                </Typography>
                                                <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
                                                    {formatTimestamp(message.createdAt)}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
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
                            sx: { borderRadius: '24px' }
                        }}
                    />
                    <Button 
                        type="submit"
                        variant="contained" 
                        color="primary" 
                        endIcon={<SendIcon />}
                        disabled={!newMessage.trim()}
                        sx={{ ml: 1, borderRadius: '24px' }}
                    >
                        Send
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default Chat; 