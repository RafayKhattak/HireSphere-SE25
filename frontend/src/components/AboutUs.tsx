import React from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    useTheme
} from '@mui/material';
import {
    School as SchoolIcon,
    Group as GroupIcon,
    Assignment as AssignmentIcon,
    Code as CodeIcon,
    Chat as ChatIcon,
    GitHub as GitHubIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

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
                    <Grid container spacing={4}>
                        {teamMembers.map((member) => (
                            <Grid item xs={12} md={4} key={member.name}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent>
                                        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                                            <Avatar
                                                sx={{
                                                    width: 120,
                                                    height: 120,
                                                    bgcolor: 'primary.main',
                                                    mb: 2
                                                }}
                                            >
                                                <Typography variant="h4">
                                                    {member.name.split(' ').map(n => n[0]).join('')}
                                                </Typography>
                                            </Avatar>
                                            <Typography variant="h5" gutterBottom>
                                                {member.name}
                                            </Typography>
                                            <Typography variant="subtitle1" color="primary" gutterBottom>
                                                {member.role}
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        <List>
                                            {member.responsibilities.map((responsibility) => (
                                                <ListItem key={responsibility}>
                                                    <ListItemIcon>
                                                        <CheckCircleIcon color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText primary={responsibility} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Features Section */}
                <Box mb={6}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', mb: 4 }}>
                        Key Features
                    </Typography>
                    <Grid container spacing={2}>
                        {features.map((feature) => (
                            <Grid item xs={12} sm={6} md={4} key={feature}>
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
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Contact Section */}
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
                        Get in Touch
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>
                                Project Repository
                            </Typography>
                            <Box display="flex" alignItems="center">
                                <GitHubIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography
                                    component="a"
                                    href="https://github.com/RafayKhattak/HireSphere-SE25"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                        color: 'primary.main',
                                        textDecoration: 'none',
                                        '&:hover': { textDecoration: 'underline' }
                                    }}
                                >
                                    https://github.com/RafayKhattak/HireSphere-SE25
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>
                                Communication
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
                        </Grid>
                    </Grid>
                </Paper>
            </Container>
        </Box>
    );
};

export default AboutUs; 