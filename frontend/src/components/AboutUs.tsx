import React from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    useTheme,
    IconButton
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import GitHubIcon from '@mui/icons-material/GitHub';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AboutUs: React.FC = () => {
    const theme = useTheme();

    const teamMembers = [
        {
            name: 'Rafay Khattak',
            role: 'Scrum Master',
            responsibilities: [
                'Facilitates Scrum meetings',
                'Removes obstacles for the development team',
                'Ensures adherence to Agile principles',
                'Helps maintain a productive work environment'
            ]
        },
        {
            name: 'Ali Irfan',
            role: 'Product Owner',
            responsibilities: [
                'Defines the vision of the product',
                'Prioritizes and manages the product backlog',
                'Ensures user stories provide business value',
                'Bridges communication between developers and stakeholders'
            ]
        },
        {
            name: 'Waseem Akhtar',
            role: 'Scrum Team Member',
            responsibilities: [
                'Develops, tests, and deploys features',
                'Collaborates with the Product Owner',
                'Ensures timely completion of sprint tasks',
                'Participates in code reviews and debugging'
            ]
        }
    ];

    const features = [
        'AI-Powered Job Recommendations',
        'Advanced Job Search with Filters',
        'Resume Parsing & Automatic Profile Creation',
        'Employer Job Posting & Management',
        'Application Tracking for Candidates',
        'Real-time Chat between Recruiters & Candidates',
        'AI-based Resume Screening for Employers',
        'Job Alerts & Notifications',
        'Skill-based Job Suggestions',
        'Online AI-powered Skill Assessments',
        'Bookmark & Save Jobs for Later',
        'Company Profiles & Reviews',
        'Interview Scheduling System',
        'Salary Estimator & Market Trends'
    ];

    return (
        <Box sx={{ py: 8, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
                {/* Header Section */}
                <Box textAlign="center" mb={8}>
                    <Typography variant="h2" component="h1" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        About HireSphere
                    </Typography>
                </Box>

                {/* Problem Statement Section */}
                <Paper elevation={3} sx={{ p: 4, mb: 6 }}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
                        Problem Statement
                    </Typography>
                    <Typography variant="body1" paragraph>
                        The lack of an intelligent job matching system and AI-driven recruitment assistance affects tech job seekers and recruiters, leading to inefficiencies in the hiring process, candidates applying for irrelevant jobs, and recruiters struggling to find suitable applicants efficiently.
                    </Typography>
                    <Typography variant="body1">
                        Our solution is HireSphere - a Tech Job Portal with AI functionalities that provides AI-driven job recommendations, automated resume screening, skill-based job suggestions, and real-time chat between recruiters and candidates.
                    </Typography>
                </Paper>

                {/* Team Section */}
                <Box mb={6}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', mb: 4 }}>
                        Our Team
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', margin: theme => theme.spacing(-1.5) }}>
                        {teamMembers.map((member, index) => (
                            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '33.33%' } }} key={index}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                                        <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                                            {member.name}
                                        </Typography>
                                        <Typography variant="subtitle1" color="primary" gutterBottom>
                                            {member.role}
                                        </Typography>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="h6" sx={{ mb: 1, textAlign: 'left' }}>Responsibilities:</Typography>
                                        <List dense sx={{ textAlign: 'left' }}>
                                            {member.responsibilities.map((responsibility, rIndex) => (
                                                <ListItem key={rIndex} sx={{ py: 0.5 }}>
                                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                                        <CheckCircleIcon color="primary" fontSize="small" />
                                                    </ListItemIcon>
                                                    <ListItemText primary={responsibility} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Features Section */}
                <Box mb={6}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', mb: 4 }}>
                        Key Features
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
                        {features.map((feature, index) => (
                            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '33.33%' } }} key={index}>
                                <Paper
                                    sx={{
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        bgcolor: 'background.paper',
                                        '&:hover': {
                                            bgcolor: 'primary.light',
                                            color: 'white',
                                            '& .MuiSvgIcon-root': {
                                                color: 'white'
                                            }
                                        }
                                    }}
                                >
                                    <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography>{feature}</Typography>
                                </Paper>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Contact Section */}
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
                        Get in Touch
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <ChatIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                                primary="WhatsApp Group"
                                secondary="Primary communication channel for daily updates"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <SchoolIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Weekly Meetings"
                                secondary="Every Sunday at 10 AM (Google Meet)"
                            />
                        </ListItem>
                    </List>
                </Paper>
            </Container>
        </Box>
    );
};

export default AboutUs; 